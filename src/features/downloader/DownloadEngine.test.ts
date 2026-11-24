import { describe, expect, it } from 'vitest';
import { DownloadEngine, type DownloadSnapshot } from './DownloadEngine';
import { DOWNLOAD_LIMITS } from './downloadConfig';

function readRequestHeader(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers;
  if (!headers) return null;

  // Headers can come from a different realm in jsdom/Vitest. Try its API first,
  // then inspect iterable/record representations if that realm returns null.
  const headerObject = headers as Headers;
  if (typeof headerObject.get === 'function') {
    const value = headerObject.get(name);
    if (value !== null) return value;
  }
  if (typeof headerObject.forEach === 'function') {
    let found: string | null = null;
    headerObject.forEach((value, key) => {
      if (key.toLowerCase() === name.toLowerCase()) found = value;
    });
    if (found !== null) return found;
  }
  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match?.[1] ?? null;
  }
  if (typeof headers === 'object') {
    const record = headers as Record<string, string>;
    const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    return key ? record[key] : null;
  }
  return null;
}

function createConfig(targetBytes = 128) {
  return {
    endpoint: 'https://download.example.test/down',
    targetBytes,
    concurrency: 2,
    chunkBytes: DOWNLOAD_LIMITS.minChunkBytes,
  };
}

describe('DownloadEngine', () => {
  it('counts bytes actually read and completes when the target is reached', async () => {
    let requestCalls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      requestCalls += 1;
      expect(readRequestHeader(init, 'Range')).toBe('bytes=0-127');
      return new Response(new Uint8Array(128), { status: 206 });
    };
    const snapshots: DownloadSnapshot[] = [];
    const engine = new DownloadEngine(createConfig(), (snapshot) => { snapshots.push(snapshot); }, fetcher);

    await engine.start();

    const lastSnapshot = snapshots[snapshots.length - 1];
    expect(lastSnapshot.status).toBe('completed');
    expect(lastSnapshot.transferredBytes).toBe(128);
    expect(lastSnapshot.requestCount).toBe(1);
    expect(requestCalls).toBe(1);
  });


  it('releases cancelled request reservations before resuming', async () => {
    let firstRequest = true;
    const fetcher: typeof fetch = async (_input, init) => {
      if (firstRequest) {
        firstRequest = false;
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }
      return new Response(new Uint8Array(128), { status: 206 });
    };
    const engine = new DownloadEngine({ ...createConfig(), concurrency: 1 }, () => undefined, fetcher);
    const firstRun = engine.start();
    engine.pause();
    await firstRun;
    expect(engine.getSnapshot().status).toBe('paused');

    await engine.resume();
    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().transferredBytes).toBe(128);
  });

  it('cancels a response stream once the reserved chunk is consumed', async () => {
    let cancelled = false;
    const fetcher: typeof fetch = async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(DOWNLOAD_LIMITS.minChunkBytes));
        controller.enqueue(new Uint8Array(DOWNLOAD_LIMITS.minChunkBytes));
      },
      cancel() { cancelled = true; },
    }), { status: 206 });
    const engine = new DownloadEngine({
      ...createConfig(DOWNLOAD_LIMITS.minChunkBytes),
      chunkBytes: DOWNLOAD_LIMITS.minChunkBytes,
      concurrency: 1,
    }, () => undefined, fetcher);
    await engine.start();
    expect(engine.getSnapshot().status).toBe('completed');
    expect(cancelled).toBe(true);
  });

  it('never counts bytes beyond the requested target when a stream chunk is oversized', async () => {
    const fetcher: typeof fetch = async () => new Response(new Uint8Array(256), { status: 206 });
    const engine = new DownloadEngine({ ...createConfig(128), concurrency: 1 }, () => undefined, fetcher);

    await engine.start();

    expect(engine.getSnapshot().status).toBe('completed');
    expect(engine.getSnapshot().transferredBytes).toBe(128);
  });

  it('fails clearly when the static host ignores the byte-range request', async () => {
    const fetcher: typeof fetch = async () => new Response(new Uint8Array(128), { status: 200 });
    const engine = new DownloadEngine({ ...createConfig(), concurrency: 1 }, () => undefined, fetcher);
    await engine.start();
    expect(engine.getSnapshot().status).toBe('error');
    expect(engine.getSnapshot().errorMessage).toMatch(/must support HTTP byte ranges/);
  });

  it('rejects declared responses larger than the requested chunk', async () => {
    const fetcher: typeof fetch = async () => new Response(new Uint8Array(0), {
      status: 206,
      headers: { 'Content-Length': String(DOWNLOAD_LIMITS.minChunkBytes + 1) },
    });
    const engine = new DownloadEngine({
      ...createConfig(DOWNLOAD_LIMITS.minChunkBytes),
      chunkBytes: DOWNLOAD_LIMITS.minChunkBytes,
      concurrency: 1,
    }, () => undefined, fetcher);
    await engine.start();
    expect(engine.getSnapshot().status).toBe('error');
    expect(engine.getSnapshot().transferredBytes).toBe(0);
  });

  it('rejects non-HTTPS remote endpoints and unsafe concurrency settings', () => {
    expect(() => new DownloadEngine({ ...createConfig(), endpoint: 'http://example.test/down' }, () => undefined)).toThrow(/HTTPS/);
    expect(() => new DownloadEngine({ ...createConfig(), concurrency: 9 }, () => undefined)).toThrow(/Concurrency/);
  });

  it('does not start a transfer larger than the configured safety maximum', () => {
    expect(() => new DownloadEngine({ ...createConfig(), targetBytes: DOWNLOAD_LIMITS.maxTargetBytes + 1 }, () => undefined)).toThrow(/Choose a target/);
  });
});

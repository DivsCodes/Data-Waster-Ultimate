import { describe, expect, it } from 'vitest';
import {
  calculateLatencyStats,
  detectCdn,
  summarizeResourceTraffic,
  validateDomain,
  validateHttpsUrl,
  probeHttpLatency,
  runSmallDownloadBenchmark,
  type LatencyProbe,
} from './networkDiagnostics';

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

describe('network diagnostics helpers', () => {
  it('calculates HTTP probe statistics and jitter from adjacent successful samples', () => {
    const samples: LatencyProbe[] = [
      { ok: true, latencyMs: 20, at: 1 },
      { ok: false, latencyMs: null, at: 2, error: 'offline' },
      { ok: true, latencyMs: 35, at: 3 },
      { ok: true, latencyMs: 25, at: 4 },
    ];
    expect(calculateLatencyStats(samples)).toEqual({
      count: 4,
      successCount: 3,
      successRate: 75,
      averageMs: 26.7,
      minMs: 20,
      maxMs: 35,
      jitterMs: 12.5,
    });
  });

  it('rejects insecure remote URLs and URLs containing credentials', () => {
    expect(() => validateHttpsUrl('http://example.com')).toThrow(/HTTPS/);
    expect(() => validateHttpsUrl('https://user:pass@example.com')).toThrow(/username or password/);
    expect(validateHttpsUrl('http://localhost:5173/health', true).hostname).toBe('localhost');
  });

  it('validates a domain and strips a URL prefix/path', () => {
    expect(validateDomain('https://Example.com/path?q=1')).toBe('example.com');
    expect(() => validateDomain('localhost')).toThrow(/valid domain/);
    expect(() => validateDomain('example.com.evil/path')).not.toThrow();
  });

  it('recognizes CDN signatures only from visible response headers', () => {
    expect(detectCdn([['cf-ray', 'abc'], ['server', 'cloudflare']])).toBe('Cloudflare');
    expect(detectCdn([['x-amz-cf-pop', 'DEL1']])).toBe('Amazon CloudFront');
    expect(detectCdn([['content-type', 'text/html']])).toBe('No CDN signature exposed');
  });

  it('summarizes resource transfer sizes by host', () => {
    const entries = [
      { name: 'https://cdn.example/a.js', transferSize: 500, encodedBodySize: 400, decodedBodySize: 800 },
      { name: 'https://cdn.example/b.css', transferSize: 300, encodedBodySize: 250, decodedBodySize: 500 },
      { name: 'https://app.example/main.js', transferSize: 0, encodedBodySize: 0, decodedBodySize: 200 },
    ] as PerformanceResourceTiming[];
    const summary = summarizeResourceTraffic(entries);
    expect(summary.resourceCount).toBe(3);
    expect(summary.measurableCount).toBe(2);
    expect(summary.totalTransferBytes).toBe(800);
    expect(summary.byHost[0]).toEqual({ host: 'cdn.example', bytes: 800, requests: 2 });
  });
});


describe('same-origin GitHub Pages network probes', () => {
  it('uses a one-byte range for the latency probe and cancels the response body', async () => {
    let rangeHeader: string | null = null;
    const fetcher: typeof fetch = async (_input, init) => {
      rangeHeader = readRequestHeader(init, 'Range');
      return new Response(new Uint8Array([1]), { status: 206 });
    };
    const result = await probeHttpLatency(undefined, fetcher);
    expect(result.ok).toBe(true);
    expect(rangeHeader).toBe('bytes=0-0');
  });

  it('uses a 1 MiB range for the explicit throughput benchmark', async () => {
    let rangeHeader: string | null = null;
    const fetcher: typeof fetch = async (_input, init) => {
      rangeHeader = readRequestHeader(init, 'Range');
      return new Response(new Uint8Array(1024 * 1024), { status: 206 });
    };
    const result = await runSmallDownloadBenchmark(undefined, fetcher);
    expect(result.bytes).toBe(1024 * 1024);
    expect(rangeHeader).toBe('bytes=0-1048575');
  });
});

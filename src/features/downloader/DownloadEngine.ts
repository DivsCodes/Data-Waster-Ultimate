import { DOWNLOAD_LIMITS, createDownloadUrl, validateDownloadEndpoint } from './downloadConfig';

export type DownloadStatus = 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'error';

export interface DownloadEngineConfig {
  endpoint: string;
  targetBytes: number;
  concurrency: number;
  chunkBytes: number;
}

export interface SpeedSample {
  at: number;
  bytesPerSecond: number;
}

export interface DownloadSnapshot {
  sessionId: string;
  status: DownloadStatus;
  targetBytes: number;
  transferredBytes: number;
  bytesPerSecond: number;
  peakSpeedBps: number;
  elapsedMs: number;
  activeTransfers: number;
  requestCount: number;
  startedAt: number | null;
  notice: string | null;
  errorMessage: string | null;
  samples: SpeedSample[];
}

export type DownloadUpdate = (snapshot: DownloadSnapshot) => void;
type Fetcher = typeof fetch;

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `dw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The download request failed for an unknown reason.';
}

export class DownloadEngine {
  private readonly config: DownloadEngineConfig;
  private readonly onUpdate: DownloadUpdate;
  private readonly fetcher: Fetcher;
  private readonly sessionId = makeSessionId();
  private status: DownloadStatus = 'idle';
  private transferredBytes = 0;
  private reservedBytes = 0;
  private peakSpeedBps = 0;
  private requestCount = 0;
  private startedAt: number | null = null;
  private activeStartedAt = 0;
  private accumulatedElapsedMs = 0;
  private generation = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private readonly controllers = new Set<AbortController>();
  private readonly speedPoints: Array<{ at: number; total: number }> = [];
  private workersPromise: Promise<void> = Promise.resolve();
  private notice: string | null = null;
  private errorMessage: string | null = null;

  constructor(config: DownloadEngineConfig, onUpdate: DownloadUpdate, fetcher: Fetcher = fetch) {
    const endpoint = validateDownloadEndpoint(config.endpoint);
    if (!Number.isFinite(config.targetBytes) || config.targetBytes <= 0 || config.targetBytes > DOWNLOAD_LIMITS.maxTargetBytes) {
      throw new Error(`Choose a target between 1 byte and ${DOWNLOAD_LIMITS.maxTargetBytes / 1024 ** 3} GB.`);
    }
    if (!Number.isInteger(config.concurrency) || config.concurrency < DOWNLOAD_LIMITS.minConcurrency || config.concurrency > DOWNLOAD_LIMITS.maxConcurrency) {
      throw new Error(`Concurrency must be between ${DOWNLOAD_LIMITS.minConcurrency} and ${DOWNLOAD_LIMITS.maxConcurrency}.`);
    }
    if (!Number.isInteger(config.chunkBytes) || config.chunkBytes < DOWNLOAD_LIMITS.minChunkBytes || config.chunkBytes > DOWNLOAD_LIMITS.maxChunkBytes) {
      throw new Error('The download chunk size is outside the supported range.');
    }

    this.config = { ...config, endpoint };
    this.onUpdate = onUpdate;
    this.fetcher = fetcher;
  }

  getSnapshot(): DownloadSnapshot {
    const now = performance.now();
    const elapsedMs = this.accumulatedElapsedMs + (this.status === 'running' ? now - this.activeStartedAt : 0);
    return {
      sessionId: this.sessionId,
      status: this.status,
      targetBytes: this.config.targetBytes,
      transferredBytes: this.transferredBytes,
      bytesPerSecond: this.calculateSpeed(now),
      peakSpeedBps: this.peakSpeedBps,
      elapsedMs,
      activeTransfers: this.controllers.size,
      requestCount: this.requestCount,
      startedAt: this.startedAt,
      notice: this.notice,
      errorMessage: this.errorMessage,
      samples: this.speedPoints.slice(-32).map((point, index, points) => {
        const previous = points[Math.max(0, index - 1)];
        const deltaMs = point.at - previous.at;
        const deltaBytes = point.total - previous.total;
        return { at: point.at, bytesPerSecond: deltaMs > 0 ? (deltaBytes * 1000) / deltaMs : 0 };
      }),
    };
  }

  async start(): Promise<void> {
    if (this.status !== 'idle') return;
    this.status = 'running';
    this.startedAt = Date.now();
    this.activeStartedAt = performance.now();
    this.generation += 1;
    this.startTicker();
    this.emit();
    this.workersPromise = this.runWorkers(this.generation);
    await this.workersPromise;
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') return;
    // Wait for aborted requests from the previous generation to release their
    // reservations before new workers calculate the remaining target.
    await this.workersPromise;
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.activeStartedAt = performance.now();
    this.generation += 1;
    this.notice = null;
    this.startTicker();
    this.emit();
    this.workersPromise = this.runWorkers(this.generation);
    await this.workersPromise;
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.accumulatedElapsedMs += performance.now() - this.activeStartedAt;
    this.status = 'paused';
    this.generation += 1;
    this.stopTicker();
    this.abortActiveRequests();
    this.notice = 'Paused. Resume whenever you are ready.';
    this.emit();
  }

  stop(): void {
    if (!['running', 'paused'].includes(this.status)) return;
    if (this.status === 'running') this.accumulatedElapsedMs += performance.now() - this.activeStartedAt;
    this.status = 'stopped';
    this.generation += 1;
    this.stopTicker();
    this.abortActiveRequests();
    this.notice = 'Session stopped by you.';
    this.emit();
  }

  dispose(): void {
    if (this.status === 'running' || this.status === 'paused') this.stop();
    this.stopTicker();
  }

  private async runWorkers(generation: number): Promise<void> {
    const workers = Array.from({ length: this.config.concurrency }, () => this.workerLoop(generation));
    await Promise.all(workers);
    if (this.status === 'running' && generation === this.generation) {
      if (this.transferredBytes >= this.config.targetBytes) this.complete();
    }
  }

  private async workerLoop(generation: number): Promise<void> {
    let retryCount = 0;

    while (this.status === 'running' && generation === this.generation) {
      const reserved = this.reserveNextChunk();
      if (reserved <= 0) return;

      let reservationRemaining = reserved;
      let receivedThisRequest = 0;
      const controller = new AbortController();
      this.controllers.add(controller);
      this.requestCount += 1;
      this.emit();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, DOWNLOAD_LIMITS.requestTimeoutMs);

      try {
        const response = await this.fetcher(createDownloadUrl(this.config.endpoint, reserved), {
          method: 'GET',
          headers: { Range: `bytes=0-${reserved - 1}` },
          mode: 'cors',
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });

        if (response.status !== 206) {
          await response.body?.cancel().catch(() => undefined);
          throw new Error(`The GitHub Pages payload must support HTTP byte ranges (expected 206, received ${response.status}).`);
        }
        const declaredLengthHeader = response.headers.get('content-length');
        const declaredLength = declaredLengthHeader === null ? null : Number(declaredLengthHeader);
        if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > reserved) {
          await response.body?.cancel().catch(() => undefined);
          throw new Error('The endpoint declared a response larger than the requested chunk. Check your download endpoint.');
        }
        if (!response.body) {
          throw new Error('This browser or endpoint did not provide a readable response stream. The transfer was stopped to avoid buffering an unbounded response.');
        }

        const consume = (byteCount: number) => {
          if (byteCount <= 0 || generation !== this.generation) return;
          // ReadableStream chunks are not guaranteed to match the requested
          // Range length. Count only bytes covered by this worker's reservation
          // and the remaining session target, especially for the final chunk
          // and when concurrent workers finish at nearly the same time.
          const acceptedBytes = Math.min(
            byteCount,
            reservationRemaining,
            Math.max(0, this.config.targetBytes - this.transferredBytes),
          );
          if (acceptedBytes <= 0) return;
          reservationRemaining -= acceptedBytes;
          this.reservedBytes = Math.max(0, this.reservedBytes - acceptedBytes);
          receivedThisRequest += acceptedBytes;
          this.transferredBytes += acceptedBytes;
          const now = performance.now();
          this.speedPoints.push({ at: now, total: this.transferredBytes });
          while (this.speedPoints.length > 2 && now - this.speedPoints[0].at > 5_000) this.speedPoints.shift();
          this.peakSpeedBps = Math.max(this.peakSpeedBps, this.calculateSpeed(now));
          if (this.transferredBytes >= this.config.targetBytes) this.complete();
          else this.emit();
        };

        const reader = response.body.getReader();
        try {
          while (this.status === 'running' && generation === this.generation) {
            const { done, value } = await reader.read();
            if (done) break;
            consume(value.byteLength);
            // A misconfigured endpoint may ignore the requested byte count. Stop
            // reading as soon as this worker's reservation is consumed rather
            // than buffering the rest of an unexpectedly large response.
            if (reservationRemaining <= 0) {
              await reader.cancel().catch(() => undefined);
              break;
            }
          }
        } finally {
          if (this.status !== 'running' || generation !== this.generation) {
            void reader.cancel().catch(() => undefined);
          }
        }

        if (this.status !== 'running' || generation !== this.generation) return;
        if (receivedThisRequest === 0) throw new Error('The download endpoint returned an empty response.');
        retryCount = 0;
        this.notice = null;
      } catch (error) {
        if (generation !== this.generation || this.status !== 'running') return;
        if (isAbortError(error) && !timedOut) return;
        retryCount += 1;
        if (retryCount > DOWNLOAD_LIMITS.maxRetries) {
          this.fail(timedOut ? 'A download request timed out repeatedly. Check the endpoint or your connection.' : errorText(error), generation);
          return;
        }
        this.notice = timedOut
          ? `A request timed out. Retrying (${retryCount}/${DOWNLOAD_LIMITS.maxRetries})…`
          : `Connection hiccup. Retrying (${retryCount}/${DOWNLOAD_LIMITS.maxRetries})…`;
        this.emit();
        await new Promise((resolve) => setTimeout(resolve, Math.min(1_500, retryCount * 350)));
      } finally {
        clearTimeout(timeout);
        this.controllers.delete(controller);
        this.reservedBytes = Math.max(0, this.reservedBytes - reservationRemaining);
        this.emit();
      }
    }
  }

  private reserveNextChunk(): number {
    const available = this.config.targetBytes - this.transferredBytes - this.reservedBytes;
    if (available <= 0) return 0;
    const chunk = Math.min(this.config.chunkBytes, available);
    this.reservedBytes += chunk;
    return chunk;
  }

  private calculateSpeed(now: number): number {
    const recent = this.speedPoints.filter((point) => now - point.at <= 2_000);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const elapsed = last.at - first.at;
    return elapsed > 0 ? ((last.total - first.total) * 1000) / elapsed : 0;
  }

  private complete(): void {
    if (this.status !== 'running') return;
    this.accumulatedElapsedMs += performance.now() - this.activeStartedAt;
    this.status = 'completed';
    this.generation += 1;
    this.stopTicker();
    this.abortActiveRequests();
    this.notice = 'Target reached. All active requests have been stopped.';
    this.emit();
  }

  private fail(message: string, generation: number): void {
    if (generation !== this.generation || this.status !== 'running') return;
    this.accumulatedElapsedMs += performance.now() - this.activeStartedAt;
    this.status = 'error';
    this.errorMessage = message;
    this.generation += 1;
    this.stopTicker();
    this.abortActiveRequests();
    this.emit();
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => this.emit(), 250);
  }

  private stopTicker(): void {
    if (this.ticker !== null) clearInterval(this.ticker);
    this.ticker = null;
  }

  private abortActiveRequests(): void {
    this.controllers.forEach((controller) => controller.abort());
  }

  private emit(): void {
    this.onUpdate(this.getSnapshot());
  }
}

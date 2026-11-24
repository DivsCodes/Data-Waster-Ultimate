import { readStorage, writeStorage } from '../../lib/storage';

export type DataUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

const UNIT_BYTES: Record<DataUnit, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

export function convertDataAmount(value: number, from: DataUnit, to: DataUnit): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const result = (value * UNIT_BYTES[from]) / UNIT_BYTES[to];
  return Number.isFinite(result) ? result : Number.MAX_VALUE;
}

export function estimateTransferSeconds(amount: number, unit: DataUnit, speedMbps: number): number | null {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(speedMbps) || speedMbps <= 0) return null;
  const bytes = amount * UNIT_BYTES[unit];
  const seconds = (bytes * 8) / (speedMbps * 1_000_000);
  return Number.isFinite(seconds) ? seconds : null;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  const total = Math.ceil(seconds);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainingSeconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export interface DownloadReminder {
  id: string;
  title: string;
  targetMB: number;
  scheduledAt: number;
  status: 'scheduled' | 'due' | 'dismissed';
  createdAt: number;
}

const REMINDERS_KEY = 'data-waster:download-reminders:v1';
const MAX_REMINDERS = 30;

function isReminder(value: unknown): value is DownloadReminder {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DownloadReminder>;
  return typeof item.id === 'string' && item.id.length > 0
    && typeof item.title === 'string' && item.title.length > 0 && item.title.length <= 80
    && typeof item.targetMB === 'number' && Number.isFinite(item.targetMB) && item.targetMB >= 1 && item.targetMB <= 10_240
    && typeof item.scheduledAt === 'number' && Number.isFinite(item.scheduledAt) && item.scheduledAt > 0
    && typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) && item.createdAt > 0
    && ['scheduled', 'due', 'dismissed'].includes(String(item.status));
}

export function normalizeReminders(value: unknown): DownloadReminder[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isReminder).slice(0, MAX_REMINDERS);
}

export function readReminders(): DownloadReminder[] {
  return normalizeReminders(readStorage<unknown>(REMINDERS_KEY, []));
}

export function writeReminders(items: DownloadReminder[]): boolean {
  return writeStorage(REMINDERS_KEY, normalizeReminders(items));
}

export function createReminder(
  input: { title: string; targetMB: number; scheduledAt: number },
  now = Date.now(),
): DownloadReminder | null {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title || title.length > 80) return null;
  if (!Number.isFinite(input.targetMB) || input.targetMB < 1 || input.targetMB > 10_240) return null;
  if (!Number.isFinite(input.scheduledAt) || input.scheduledAt < now + 60_000 || input.scheduledAt > now + 365 * 86_400_000) return null;
  return {
    id: `reminder-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    targetMB: input.targetMB,
    scheduledAt: input.scheduledAt,
    status: 'scheduled',
    createdAt: now,
  };
}

export function markDueReminders(items: DownloadReminder[], now = Date.now()): { items: DownloadReminder[]; newlyDue: DownloadReminder[] } {
  const newlyDue: DownloadReminder[] = [];
  const updated = normalizeReminders(items).map((item) => {
    if (item.status === 'scheduled' && item.scheduledAt <= now) {
      const due = { ...item, status: 'due' as const };
      newlyDue.push(due);
      return due;
    }
    return item;
  });
  return { items: updated, newlyDue };
}

export function dismissReminder(items: DownloadReminder[], id: string): DownloadReminder[] {
  return normalizeReminders(items).map((item) => item.id === id ? { ...item, status: 'dismissed' } : item);
}

export const API_PLAYGROUND_MAX_BODY_BYTES = 32 * 1024;
export const API_PLAYGROUND_MAX_RESPONSE_BYTES = 512 * 1024;
export const API_PLAYGROUND_TIMEOUT_MS = 15_000;

export interface ApiPlaygroundInput {
  url: string;
  method: ApiMethod;
  headersText: string;
  body: string;
}

export interface ApiPlaygroundConfig {
  url: string;
  method: ApiMethod;
  headers: Record<string, string>;
  body?: string;
}

const API_METHODS: ApiMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

export function validatePlaygroundUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a complete URL, including https://.');
  }
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHosts.has(url.hostname))) {
    throw new Error('Only HTTPS URLs are allowed. HTTP is allowed for localhost testing.');
  }
  if (url.username || url.password) throw new Error('Credentials must not be embedded in the URL.');
  if (url.hash) url.hash = '';
  return url.toString();
}

export function parsePlaygroundHeaders(value: string): Record<string, string> {
  if (!value.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Headers must be valid JSON, for example {"Accept":"application/json"}.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers must be a JSON object with string values.');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length > 30) throw new Error('Use no more than 30 request headers.');
  const headers: Record<string, string> = {};
  for (const [name, headerValue] of entries) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error(`Invalid header name: ${name}`);
    if (typeof headerValue !== 'string' || /[\r\n]/.test(headerValue)) throw new Error(`Header ${name} must have a single-line string value.`);
    headers[name] = headerValue;
  }
  return headers;
}

export function validateApiPlaygroundInput(input: ApiPlaygroundInput): ApiPlaygroundConfig {
  if (!API_METHODS.includes(input.method)) throw new Error('Choose a supported HTTP method.');
  const url = validatePlaygroundUrl(input.url);
  const headers = parsePlaygroundHeaders(input.headersText);
  const bodyBytes = new TextEncoder().encode(input.body).byteLength;
  if (bodyBytes > API_PLAYGROUND_MAX_BODY_BYTES) throw new Error('Request body is larger than 32 KiB.');
  if (['GET', 'HEAD'].includes(input.method) && input.body.trim()) throw new Error(`${input.method} requests cannot include a body.`);
  return { url, method: input.method, headers, ...(input.body ? { body: input.body } : {}) };
}

export interface ApiPlaygroundResult {
  status: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  responseHeaders: Record<string, string>;
  body: string;
  truncated: boolean;
}

export async function executeApiPlaygroundRequest(
  input: ApiPlaygroundInput,
  fetcher: typeof fetch = fetch,
): Promise<ApiPlaygroundResult> {
  const config = validateApiPlaygroundInput(input);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_PLAYGROUND_TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const response = await fetcher(config.url, {
      method: config.method,
      headers: config.headers,
      ...(config.body ? { body: config.body } : {}),
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    let body = '';
    let receivedBytes = 0;
    let truncated = false;
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > API_PLAYGROUND_MAX_RESPONSE_BYTES) {
          const allowed = Math.max(0, value.byteLength - (receivedBytes - API_PLAYGROUND_MAX_RESPONSE_BYTES));
          body += decoder.decode(value.subarray(0, allowed), { stream: true });
          truncated = true;
          await reader.cancel();
          break;
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } else if (config.method !== 'HEAD') {
      body = 'Response body was not read because this browser did not expose a readable stream. This avoids buffering an unbounded response.';
    }
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => { responseHeaders[name] = value; });
    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs: Math.max(0, performance.now() - startedAt),
      responseHeaders,
      body: truncated ? `${body}\n\n[Response truncated at 512 KiB]` : body,
      truncated,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface PerformanceSnapshot {
  capturedAt: number;
  online: boolean;
  viewport: string;
  pixelRatio: number;
  cores: number | null;
  deviceMemoryGB: number | null;
  connectionType: string;
  connectionDownlinkMbps: number | null;
  connectionRttMs: number | null;
  jsHeapUsedMB: number | null;
  jsHeapLimitMB: number | null;
  navigationLoadMs: number | null;
  resourceCount: number;
  resourceTransferBytes: number;
  resourceDecodedBytes: number;
  localStorageApproxBytes: number | null;
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number };
}

interface ExtendedPerformance extends Performance {
  memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number };
}

export function getPerformanceSnapshot(): PerformanceSnapshot {
  const nav = navigator as ExtendedNavigator;
  const perf = performance as ExtendedPerformance;
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  let storageBytes: number | null = null;
  try {
    let total = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
    storageBytes = total;
  } catch {
    storageBytes = null;
  }
  return {
    capturedAt: Date.now(),
    online: navigator.onLine,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    cores: Number.isFinite(nav.hardwareConcurrency) ? nav.hardwareConcurrency : null,
    deviceMemoryGB: Number.isFinite(nav.deviceMemory) ? nav.deviceMemory ?? null : null,
    connectionType: nav.connection?.effectiveType ?? 'Not exposed',
    connectionDownlinkMbps: Number.isFinite(nav.connection?.downlink) ? nav.connection?.downlink ?? null : null,
    connectionRttMs: Number.isFinite(nav.connection?.rtt) ? nav.connection?.rtt ?? null : null,
    jsHeapUsedMB: Number.isFinite(perf.memory?.usedJSHeapSize) ? (perf.memory?.usedJSHeapSize ?? 0) / 1024 ** 2 : null,
    jsHeapLimitMB: Number.isFinite(perf.memory?.jsHeapSizeLimit) ? (perf.memory?.jsHeapSizeLimit ?? 0) / 1024 ** 2 : null,
    navigationLoadMs: navigation && navigation.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : null,
    resourceCount: entries.length,
    resourceTransferBytes: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    resourceDecodedBytes: entries.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
    localStorageApproxBytes: storageBytes,
  };
}

export function formatBytesCompact(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'Not exposed';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = -1;
  do { value /= 1024; index += 1; } while (value >= 1024 && index < units.length - 1);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
}

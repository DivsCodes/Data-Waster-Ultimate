import { DEFAULT_DOWNLOAD_ENDPOINT } from '../downloader/downloadConfig';

export interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface BrowserNetworkSnapshot {
  online: boolean;
  effectiveType: string | null;
  connectionType: string | null;
  downlinkMbps: number | null;
  estimatedRttMs: number | null;
  saveData: boolean | null;
  userAgent: string;
}

export interface LatencyProbe {
  ok: boolean;
  latencyMs: number | null;
  at: number;
  error?: string;
}

export interface LatencyStats {
  count: number;
  successCount: number;
  successRate: number;
  averageMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  jitterMs: number | null;
}

export interface DnsRecord {
  address: string;
  ttl: number | null;
  type: number;
}

export interface HeaderInspection {
  url: string;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  cdn: string;
}

export interface ResourceTrafficSummary {
  resourceCount: number;
  measurableCount: number;
  totalTransferBytes: number;
  totalEncodedBytes: number;
  totalDecodedBytes: number;
  byHost: Array<{ host: string; bytes: number; requests: number }>;
}

export const DEFAULT_LATENCY_ENDPOINT = DEFAULT_DOWNLOAD_ENDPOINT;
export const LATENCY_PROBE_TIMEOUT_MS = 8_000;
export const NETWORK_EVENT_STORAGE_KEY = 'data-waster.network-events.v1';

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

export function getBrowserNetworkSnapshot(): BrowserNetworkSnapshot {
  if (typeof navigator === 'undefined') {
    return {
      online: false,
      effectiveType: null,
      connectionType: null,
      downlinkMbps: null,
      estimatedRttMs: null,
      saveData: null,
      userAgent: 'Unavailable',
    };
  }

  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType ?? null,
    connectionType: connection?.type ?? null,
    downlinkMbps: typeof connection?.downlink === 'number' ? connection.downlink : null,
    estimatedRttMs: typeof connection?.rtt === 'number' ? connection.rtt : null,
    saveData: typeof connection?.saveData === 'boolean' ? connection.saveData : null,
    userAgent: navigator.userAgent || 'Unavailable',
  };
}

export function validateHttpsUrl(input: string, allowLocalHttp = false): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a complete URL, including https://.');
  }
  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(allowLocalHttp && localHost && url.protocol === 'http:')) {
    throw new Error('For safety, use an HTTPS URL. HTTP is allowed only for localhost testing.');
  }
  if (url.username || url.password) throw new Error('URLs containing a username or password are not allowed.');
  if (url.hash) url.hash = '';
  return url;
}

export async function probeHttpLatency(
  endpoint = DEFAULT_LATENCY_ENDPOINT,
  fetcher: typeof fetch = fetch,
  timeoutMs = LATENCY_PROBE_TIMEOUT_MS,
): Promise<LatencyProbe> {
  const at = Date.now();
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = validateHttpsUrl(endpoint, true);
    // Ask for a single byte; the response body is cancelled after headers arrive.
    url.searchParams.set('_dw_probe', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    const response = await fetcher(url.toString(), {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (response.status !== 206) throw new Error(`The GitHub Pages payload must support HTTP byte ranges (expected 206, received ${response.status}).`);
    const latencyMs = Math.max(0, performance.now() - started);
    if (response.body) void response.body.cancel().catch(() => undefined);
    return { ok: true, latencyMs, at };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Probe timed out.'
      : error instanceof Error
        ? error.message
        : 'The HTTP probe failed. Check the endpoint and its CORS policy.';
    return { ok: false, latencyMs: null, at, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function calculateLatencyStats(samples: LatencyProbe[]): LatencyStats {
  const successful = samples.filter((sample): sample is LatencyProbe & { latencyMs: number } => sample.ok && sample.latencyMs !== null);
  const values = successful.map((sample) => sample.latencyMs);
  const differences = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  const average = values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

  return {
    count: samples.length,
    successCount: successful.length,
    successRate: samples.length ? (successful.length / samples.length) * 100 : 0,
    averageMs: average === null ? null : Math.round(average * 10) / 10,
    minMs: values.length ? Math.round(Math.min(...values) * 10) / 10 : null,
    maxMs: values.length ? Math.round(Math.max(...values) * 10) / 10 : null,
    jitterMs: differences.length
      ? Math.round((differences.reduce((total, value) => total + value, 0) / differences.length) * 10) / 10
      : null,
  };
}

export function validateDomain(input: string): string {
  const candidate = input.trim().replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  if (!candidate || candidate.length > 253 || !/^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(candidate)) {
    throw new Error('Enter a valid domain, such as example.com.');
  }
  return candidate.toLowerCase();
}

export async function lookupDnsRecords(domainInput: string, fetcher: typeof fetch = fetch): Promise<{ domain: string; records: DnsRecord[]; status: number }> {
  const domain = validateDomain(domainInput);
  const url = new URL('https://dns.google/resolve');
  url.searchParams.set('name', domain);
  url.searchParams.set('type', 'A');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(url.toString(), { method: 'GET', mode: 'cors', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`DNS-over-HTTPS service returned HTTP ${response.status}.`);
    const payload = await response.json() as { Status?: number; Answer?: Array<{ data?: string; TTL?: number; type?: number }> };
    const records = (payload.Answer ?? [])
      .filter((answer) => answer.type === 1 && typeof answer.data === 'string')
      .map((answer) => ({ address: answer.data as string, ttl: typeof answer.TTL === 'number' ? answer.TTL : null, type: answer.type ?? 1 }));
    return { domain, records, status: typeof payload.Status === 'number' ? payload.Status : -1 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublicIp(fetcher: typeof fetch = fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher('https://api.ipify.org?format=json', { method: 'GET', mode: 'cors', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`IP information service returned HTTP ${response.status}.`);
    const payload = await response.json() as { ip?: unknown };
    if (typeof payload.ip !== 'string' || payload.ip.length > 64) throw new Error('The IP information service returned an unexpected response.');
    return payload.ip;
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectHttpHeaders(input: string, fetcher: typeof fetch = fetch): Promise<HeaderInspection> {
  const url = validateHttpsUrl(input, true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(url.toString(), {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    const headers: Array<[string, string]> = [];
    response.headers.forEach((value, key) => headers.push([key, value]));
    headers.sort(([left], [right]) => left.localeCompare(right));
    return {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      headers,
      cdn: detectCdn(headers),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function detectCdn(headers: Array<[string, string]>): string {
  const normalized = new Map(headers.map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]));
  if (normalized.has('cf-ray') || normalized.has('cf-cache-status')) return 'Cloudflare';
  if (normalized.has('x-amz-cf-id') || normalized.has('x-amz-cf-pop')) return 'Amazon CloudFront';
  if (normalized.has('x-fastly-request-id') || normalized.has('fastly-debug-digest')) return 'Fastly';
  if (normalized.has('x-akamai-transformed') || normalized.has('akamai-grn')) return 'Akamai';
  if (normalized.has('x-cache') || normalized.has('via')) return 'Possible CDN / proxy (unconfirmed)';
  return 'No CDN signature exposed';
}

export function summarizeResourceTraffic(entries: PerformanceResourceTiming[]): ResourceTrafficSummary {
  const byHost = new Map<string, { host: string; bytes: number; requests: number }>();
  let totalTransferBytes = 0;
  let totalEncodedBytes = 0;
  let totalDecodedBytes = 0;
  let measurableCount = 0;

  for (const entry of entries) {
    let host = 'unknown host';
    try { host = new URL(entry.name).host || 'same-origin'; } catch { /* Ignore malformed resource names. */ }
    const transfer = Math.max(0, entry.transferSize || 0);
    const encoded = Math.max(0, entry.encodedBodySize || 0);
    const decoded = Math.max(0, entry.decodedBodySize || 0);
    if (transfer > 0) measurableCount += 1;
    totalTransferBytes += transfer;
    totalEncodedBytes += encoded;
    totalDecodedBytes += decoded;
    const current = byHost.get(host) ?? { host, bytes: 0, requests: 0 };
    current.bytes += transfer;
    current.requests += 1;
    byHost.set(host, current);
  }

  return {
    resourceCount: entries.length,
    measurableCount,
    totalTransferBytes,
    totalEncodedBytes,
    totalDecodedBytes,
    byHost: [...byHost.values()].sort((left, right) => right.bytes - left.bytes).slice(0, 6),
  };
}

export function readNetworkEvents(): Array<{ id: string; at: number; title: string; detail: string; tone: 'good' | 'warning' | 'neutral' }> {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(NETWORK_EVENT_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is { id: string; at: number; title: string; detail: string; tone: 'good' | 'warning' | 'neutral' } => {
      if (!item || typeof item !== 'object') return false;
      const value = item as Record<string, unknown>;
      return typeof value.id === 'string' && typeof value.at === 'number' && typeof value.title === 'string'
        && typeof value.detail === 'string' && ['good', 'warning', 'neutral'].includes(String(value.tone));
    }).slice(0, 40);
  } catch {
    return [];
  }
}

export function addNetworkEvent(title: string, detail: string, tone: 'good' | 'warning' | 'neutral' = 'neutral'): Array<{ id: string; at: number; title: string; detail: string; tone: 'good' | 'warning' | 'neutral' }> {
  const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), title, detail, tone }, ...readNetworkEvents()].slice(0, 40);
  try { localStorage.setItem(NETWORK_EVENT_STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage can be disabled or full; the lab still works in memory. */ }
  return next;
}

export async function runSmallDownloadBenchmark(
  endpoint = DEFAULT_LATENCY_ENDPOINT,
  fetcher: typeof fetch = fetch,
): Promise<{ bytes: number; durationMs: number; megabitsPerSecond: number }> {
  const url = validateHttpsUrl(endpoint, true);
  const bytesTarget = 1024 * 1024;
  url.searchParams.set('_dw_benchmark', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const started = performance.now();
  let bytes = 0;
  try {
    const response = await fetcher(url.toString(), {
      method: 'GET', headers: { Range: `bytes=0-${bytesTarget - 1}` }, mode: 'cors', cache: 'no-store', credentials: 'omit',
      referrerPolicy: 'no-referrer', signal: controller.signal,
    });
    if (response.status !== 206) throw new Error(`The GitHub Pages payload must support HTTP byte ranges (expected 206, received ${response.status}).`);
    if (!response.body) throw new Error('The browser could not read the benchmark response stream.');

    const reader = response.body.getReader();
    try {
      while (bytes < bytesTarget) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += Math.min(value.byteLength, bytesTarget - bytes);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const durationMs = Math.max(1, performance.now() - started);
    if (bytes === 0) throw new Error('The benchmark endpoint returned an empty response.');
    return { bytes, durationMs, megabitsPerSecond: (bytes * 8) / (durationMs / 1000) / 1_000_000 };
  } finally {
    clearTimeout(timeout);
  }
}

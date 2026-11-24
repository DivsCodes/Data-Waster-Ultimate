const siteBase = typeof window === 'undefined'
  ? 'https://localhost/'
  : new URL(import.meta.env?.BASE_URL || './', window.location.href).toString();

// The payload is a static asset served by this same GitHub Pages site.
// No external download host or backend is required.
export const DEFAULT_DOWNLOAD_ENDPOINT = new URL('data-waster-payload.bin', siteBase).toString();

export const DOWNLOAD_LIMITS = {
  maxTargetBytes: 10 * 1024 ** 3,
  maxConcurrency: 4,
  minConcurrency: 1,
  defaultConcurrency: 2,
  minChunkBytes: 64 * 1024,
  maxChunkBytes: 5 * 1024 ** 2,
  defaultChunkBytes: 5 * 1024 ** 2,
  requestTimeoutMs: 30_000,
  maxRetries: 3,
} as const;

export function validateDownloadEndpoint(endpoint: string): string {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('The download endpoint is not a valid URL.');
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocalhost && parsed.protocol === 'http:')) {
    throw new Error('The download endpoint must use HTTPS (HTTP is allowed only on localhost).');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Do not put credentials in the download endpoint URL.');
  }
  if (parsed.hash) parsed.hash = '';
  return parsed.toString();
}

let requestSequence = 0;

export function createDownloadUrl(endpoint: string, bytes: number): string {
  const url = new URL(validateDownloadEndpoint(endpoint));
  url.searchParams.set('bytes', String(Math.max(0, Math.floor(bytes))));
  url.searchParams.set('_dw', `${Date.now()}-${requestSequence++}`);
  return url.toString();
}

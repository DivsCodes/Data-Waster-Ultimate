import { describe, expect, it } from 'vitest';
import { createDownloadUrl, DEFAULT_DOWNLOAD_ENDPOINT, DOWNLOAD_LIMITS } from './downloadConfig';

describe('GitHub Pages download configuration', () => {
  it('uses the same-origin static payload by default', () => {
    const endpoint = new URL(DEFAULT_DOWNLOAD_ENDPOINT);
    expect(endpoint.origin).toBe(window.location.origin);
    expect(endpoint.pathname).toMatch(/data-waster-payload\.bin$/);
    expect(DOWNLOAD_LIMITS.maxChunkBytes).toBe(5 * 1024 * 1024);
  });

  it('adds a bounded byte count and cache-busting token to payload requests', () => {
    const request = new URL(createDownloadUrl(DEFAULT_DOWNLOAD_ENDPOINT, 4096));
    expect(request.searchParams.get('bytes')).toBe('4096');
    expect(request.searchParams.get('_dw')).toBeTruthy();
  });
});

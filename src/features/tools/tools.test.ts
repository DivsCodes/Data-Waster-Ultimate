import { describe, expect, it } from 'vitest';
import {
  convertDataAmount,
  createReminder,
  dismissReminder,
  executeApiPlaygroundRequest,
  estimateTransferSeconds,
  formatBytesCompact,
  formatDuration,
  markDueReminders,
  normalizeReminders,
  parsePlaygroundHeaders,
  validateApiPlaygroundInput,
  validatePlaygroundUrl,
} from './tools';

describe('Phase 10 utilities', () => {
  it('converts binary data units accurately', () => {
    expect(convertDataAmount(1024, 'MB', 'GB')).toBe(1);
    expect(convertDataAmount(1, 'GB', 'MB')).toBe(1024);
    expect(convertDataAmount(-2, 'GB', 'MB')).toBe(0);
    expect(convertDataAmount(Number.NaN, 'GB', 'MB')).toBe(0);
  });

  it('estimates transfer time from decimal Mbps and formats durations', () => {
    expect(estimateTransferSeconds(1, 'MB', 8)).toBe(1.048576);
    expect(estimateTransferSeconds(1, 'GB', 0)).toBeNull();
    expect(formatDuration(3661)).toBe('1h 1m 1s');
    expect(formatDuration(Number.NaN)).toBe('—');
  });

  it('creates only valid future reminders and transitions due items once', () => {
    const now = 1_700_000_000_000;
    expect(createReminder({ title: '  Test   run ', targetMB: 50, scheduledAt: now + 120_000 }, now)?.title).toBe('Test run');
    expect(createReminder({ title: 'Invalid', targetMB: 0, scheduledAt: now + 30_000 }, now)).toBeNull();
    expect(createReminder({ title: 'Too soon', targetMB: 50, scheduledAt: now + 10_000 }, now)).toBeNull();
    const item = createReminder({ title: 'Tomorrow', targetMB: 100, scheduledAt: now + 2_000_000 }, now);
    expect(item).not.toBeNull();
    const first = markDueReminders([item!], now + 2_000_000);
    expect(first.newlyDue).toHaveLength(1);
    expect(first.items[0].status).toBe('due');
    expect(markDueReminders(first.items, now + 2_000_001).newlyDue).toHaveLength(0);
    expect(dismissReminder(first.items, item!.id)[0].status).toBe('dismissed');
  });

  it('normalizes reminder lists without trusting malformed storage', () => {
    expect(normalizeReminders({ bad: true })).toEqual([]);
    expect(normalizeReminders([{ id: 'x' }, null])).toEqual([]);
  });

  it('restricts playground URLs to HTTPS or localhost HTTP', () => {
    expect(validatePlaygroundUrl('https://example.com/path#fragment')).toBe('https://example.com/path');
    expect(validatePlaygroundUrl('http://localhost:3000/health')).toBe('http://localhost:3000/health');
    expect(() => validatePlaygroundUrl('http://example.com')).toThrow(/HTTPS/);
    expect(() => validatePlaygroundUrl('javascript:alert(1)')).toThrow();
    expect(() => validatePlaygroundUrl('https://user:pass@example.com')).toThrow(/Credentials/);
  });

  it('validates JSON headers and limits request input', () => {
    expect(parsePlaygroundHeaders('{"Accept":"application/json"}')).toEqual({ Accept: 'application/json' });
    expect(() => parsePlaygroundHeaders('not-json')).toThrow(/valid JSON/);
    expect(() => parsePlaygroundHeaders('{"Bad Header":"x"}')).toThrow(/header name/i);
    expect(() => parsePlaygroundHeaders('{"X-Test":"line\\nbreak"}')).toThrow(/single-line/);
    expect(() => validateApiPlaygroundInput({ url: 'https://example.com', method: 'GET', headersText: '{}', body: 'not-empty' })).toThrow(/cannot include a body/);
    expect(() => validateApiPlaygroundInput({ url: 'https://example.com', method: 'POST', headersText: '{}', body: 'x'.repeat(33 * 1024) })).toThrow(/32 KiB/);
  });

  it('does not buffer a response when a readable stream is unavailable', async () => {
    const fetcher: typeof fetch = async () => new Response(null, { status: 200, statusText: 'OK' });
    const result = await executeApiPlaygroundRequest({
      url: 'https://example.test/api', method: 'GET', headersText: '{}', body: '',
    }, fetcher);
    expect(result.status).toBe(200);
    expect(result.body).toMatch(/was not read/i);
  });

  it('formats byte metrics without inventing unavailable browser values', () => {
    expect(formatBytesCompact(null)).toBe('Not exposed');
    expect(formatBytesCompact(1024)).toBe('1.0 KB');
  });
});

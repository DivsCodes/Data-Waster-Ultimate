import { beforeEach, describe, expect, it } from 'vitest';
import { clearSessions, readSessions, saveSession } from './sessionStorage';

beforeEach(() => window.localStorage.clear());

const session = {
  id: 'session-1',
  startedAt: 1_000,
  finishedAt: 2_000,
  status: 'completed' as const,
  targetBytes: 1_024,
  transferredBytes: 1_024,
  elapsedMs: 1_000,
  averageSpeedBps: 1_024,
  peakSpeedBps: 2_048,
  requestCount: 1,
};

describe('session storage', () => {
  it('saves and reads valid session summaries', () => {
    expect(saveSession(session)).toBe(true);
    expect(readSessions()).toEqual([session]);
  });

  it('replaces duplicate session IDs instead of duplicating records', () => {
    saveSession(session);
    saveSession({ ...session, transferredBytes: 900 });
    expect(readSessions()).toHaveLength(1);
    expect(readSessions()[0].transferredBytes).toBe(900);
  });

  it('clears all saved session records', () => {
    saveSession(session);
    expect(clearSessions()).toBe(true);
    expect(readSessions()).toEqual([]);
  });

  it('ignores malformed records already in local storage', () => {
    window.localStorage.setItem('data-waster:sessions:v1', JSON.stringify([{ id: 'bad', transferredBytes: 'lots' }]));
    expect(readSessions()).toEqual([]);
  });
});

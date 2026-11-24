import { describe, expect, it } from 'vitest';
import {
  buildDailyUsage,
  buildHeatmap,
  filterSessionsByPeriod,
  getPersonalRecords,
  sessionsToCsv,
  summarizeSessions,
} from './analytics';
import type { DownloadSessionRecord } from '../sessions/sessionStorage';

const now = new Date(2026, 10, 24, 12).getTime();
const sampleSessions: DownloadSessionRecord[] = [
  { id: 'one', startedAt: now - 2 * 86_400_000, finishedAt: now - 2 * 86_400_000 + 1000, status: 'completed', targetBytes: 1024, transferredBytes: 1024, elapsedMs: 1000, averageSpeedBps: 1024, peakSpeedBps: 2048, requestCount: 1 },
  { id: 'two', startedAt: now - 20 * 86_400_000, finishedAt: now - 20 * 86_400_000 + 2000, status: 'stopped', targetBytes: 4096, transferredBytes: 2048, elapsedMs: 2000, averageSpeedBps: 1024, peakSpeedBps: 4096, requestCount: 2 },
  { id: 'three', startedAt: now - 1 * 86_400_000, finishedAt: now - 1 * 86_400_000 + 3000, status: 'error', targetBytes: 8192, transferredBytes: 4096, elapsedMs: 3000, averageSpeedBps: 1365, peakSpeedBps: 8192, requestCount: 3 },
];

describe('analytics helpers', () => {
  it('summarizes totals and completion rate from actual records', () => {
    const summary = summarizeSessions(sampleSessions);
    expect(summary.sessionCount).toBe(3);
    expect(summary.transferredBytes).toBe(7168);
    expect(summary.completedCount).toBe(1);
    expect(summary.stoppedCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(summary.completionRate).toBeCloseTo(100 / 3);
  });

  it('filters by selected period and keeps newest sessions first', () => {
    expect(filterSessionsByPeriod(sampleSessions, '7d', now).map((item) => item.id)).toEqual(['three', 'one']);
    expect(filterSessionsByPeriod(sampleSessions, 'all', now)).toHaveLength(3);
  });

  it('builds daily usage buckets for the requested dates', () => {
    const usage = buildDailyUsage(sampleSessions, 3, now);
    expect(usage).toHaveLength(3);
    expect(usage.reduce((sum, item) => sum + item.bytes, 0)).toBe(5120);
    expect(usage.reduce((sum, item) => sum + item.sessions, 0)).toBe(2);
  });

  it('builds a seven-day-per-week heatmap with intensity levels', () => {
    const heatmap = buildHeatmap(sampleSessions, 4, now);
    expect(heatmap).toHaveLength(4);
    expect(heatmap.every((week) => week.length === 7)).toBe(true);
    expect(heatmap.flat().some((day) => day.bytes > 0)).toBe(true);
  });

  it('finds personal records from session summaries', () => {
    const records = getPersonalRecords(sampleSessions);
    expect(records.biggestSession?.id).toBe('three');
    expect(records.longestSession?.id).toBe('three');
    expect(records.highestPeakSpeed?.id).toBe('three');
    expect(records.mostRecent?.id).toBe('three');
  });

  it('exports CSV with escaped cells and a header', () => {
    const csv = sessionsToCsv([{ ...sampleSessions[0], id: 'session,"quoted"' }]);
    expect(csv.startsWith('Session ID,Started At,Finished At')).toBe(true);
    expect(csv).toContain('"session,""quoted"""');
  });
});

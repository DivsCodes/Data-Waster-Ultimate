import type { DownloadSessionRecord } from '../sessions/sessionStorage';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsSummary {
  sessionCount: number;
  completedCount: number;
  stoppedCount: number;
  errorCount: number;
  transferredBytes: number;
  elapsedMs: number;
  averageSpeedBps: number;
  peakSpeedBps: number;
  completionRate: number;
}

export interface DailyUsage {
  dateKey: string;
  date: Date;
  bytes: number;
  sessions: number;
  peakSpeedBps: number;
}

export interface HeatmapDay extends DailyUsage {
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface PersonalRecords {
  biggestSession: DownloadSessionRecord | null;
  fastestSession: DownloadSessionRecord | null;
  longestSession: DownloadSessionRecord | null;
  highestPeakSpeed: DownloadSessionRecord | null;
  mostRecent: DownloadSessionRecord | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodStart(period: AnalyticsPeriod, now = Date.now()): number | null {
  const days: Record<Exclude<AnalyticsPeriod, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };
  if (period === 'all') return null;
  return now - days[period] * DAY_MS;
}

export function filterSessionsByPeriod(
  sessions: DownloadSessionRecord[],
  period: AnalyticsPeriod,
  now = Date.now(),
): DownloadSessionRecord[] {
  const start = getPeriodStart(period, now);
  return [...sessions]
    .filter((session) => start === null || session.finishedAt >= start)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function summarizeSessions(sessions: DownloadSessionRecord[]): AnalyticsSummary {
  const transferredBytes = sessions.reduce((sum, session) => sum + session.transferredBytes, 0);
  const elapsedMs = sessions.reduce((sum, session) => sum + session.elapsedMs, 0);
  const completedCount = sessions.filter((session) => session.status === 'completed').length;
  const stoppedCount = sessions.filter((session) => session.status === 'stopped').length;
  const errorCount = sessions.filter((session) => session.status === 'error').length;
  const peakSpeedBps = sessions.reduce((max, session) => Math.max(max, session.peakSpeedBps), 0);

  return {
    sessionCount: sessions.length,
    completedCount,
    stoppedCount,
    errorCount,
    transferredBytes,
    elapsedMs,
    averageSpeedBps: elapsedMs > 0 ? (transferredBytes * 1000) / elapsedMs : 0,
    peakSpeedBps,
    completionRate: sessions.length > 0 ? (completedCount / sessions.length) * 100 : 0,
  };
}

export function buildDailyUsage(sessions: DownloadSessionRecord[], days = 14, now = Date.now()): DailyUsage[] {
  const count = Math.max(1, Math.min(366, Math.floor(days)));
  const result: DailyUsage[] = [];
  const buckets = new Map<string, DailyUsage>();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    const key = dateKey(date);
    const item = { dateKey: key, date, bytes: 0, sessions: 0, peakSpeedBps: 0 };
    result.push(item);
    buckets.set(key, item);
  }

  for (const session of sessions) {
    const key = dateKey(new Date(session.startedAt));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.bytes += session.transferredBytes;
    bucket.sessions += 1;
    bucket.peakSpeedBps = Math.max(bucket.peakSpeedBps, session.peakSpeedBps);
  }

  return result;
}

export function buildHeatmap(sessions: DownloadSessionRecord[], weeks = 12, now = Date.now()): HeatmapDay[][] {
  const weekCount = Math.max(1, Math.min(53, Math.floor(weeks)));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek - (weekCount - 1) * 7);
  const days: DailyUsage[] = [];
  const buckets = new Map<string, DailyUsage>();

  for (let index = 0; index < weekCount * 7; index += 1) {
    const date = new Date(start.getTime() + index * DAY_MS);
    const item = { dateKey: dateKey(date), date, bytes: 0, sessions: 0, peakSpeedBps: 0 };
    days.push(item);
    buckets.set(item.dateKey, item);
  }

  for (const session of sessions) {
    const bucket = buckets.get(dateKey(new Date(session.startedAt)));
    if (!bucket) continue;
    bucket.bytes += session.transferredBytes;
    bucket.sessions += 1;
    bucket.peakSpeedBps = Math.max(bucket.peakSpeedBps, session.peakSpeedBps);
  }

  const maxBytes = Math.max(0, ...days.map((day) => day.bytes));
  const withIntensity: HeatmapDay[] = days.map((day) => ({
    ...day,
    intensity: day.bytes <= 0 ? 0 : maxBytes > 0 ? (Math.min(4, Math.ceil((day.bytes / maxBytes) * 4)) as 1 | 2 | 3 | 4) : 0,
  }));

  return Array.from({ length: weekCount }, (_, weekIndex) => withIntensity.slice(weekIndex * 7, (weekIndex + 1) * 7));
}

export function getPersonalRecords(sessions: DownloadSessionRecord[]): PersonalRecords {
  const by = (selector: (session: DownloadSessionRecord) => number) =>
    [...sessions].sort((a, b) => selector(b) - selector(a))[0] ?? null;
  return {
    biggestSession: by((session) => session.transferredBytes),
    fastestSession: by((session) => session.averageSpeedBps),
    longestSession: by((session) => session.elapsedMs),
    highestPeakSpeed: by((session) => session.peakSpeedBps),
    mostRecent: [...sessions].sort((a, b) => b.startedAt - a.startedAt)[0] ?? null,
  };
}

export function sessionsToCsv(sessions: DownloadSessionRecord[]): string {
  const headers = ['Session ID', 'Started At', 'Finished At', 'Status', 'Target Bytes', 'Transferred Bytes', 'Duration ms', 'Average Bytes Per Second', 'Peak Bytes Per Second', 'Requests'];
  const rows = sessions.map((session) => [
    session.id,
    new Date(session.startedAt).toISOString(),
    new Date(session.finishedAt).toISOString(),
    session.status,
    session.targetBytes,
    session.transferredBytes,
    session.elapsedMs,
    session.averageSpeedBps,
    session.peakSpeedBps,
    session.requestCount,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

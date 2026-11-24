import { readStorage, writeStorage } from '../../lib/storage';
import type { DownloadStatus } from '../downloader/DownloadEngine';

const SESSIONS_KEY = 'data-waster:sessions:v1';
const MAX_SESSIONS = 100;

export interface DownloadSessionRecord {
  id: string;
  startedAt: number;
  finishedAt: number;
  status: Extract<DownloadStatus, 'completed' | 'stopped' | 'error'>;
  targetBytes: number;
  transferredBytes: number;
  elapsedMs: number;
  averageSpeedBps: number;
  peakSpeedBps: number;
  requestCount: number;
}

function isSessionRecord(value: unknown): value is DownloadSessionRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DownloadSessionRecord>;
  const numericFields = [
    item.startedAt,
    item.finishedAt,
    item.targetBytes,
    item.transferredBytes,
    item.elapsedMs,
    item.averageSpeedBps,
    item.peakSpeedBps,
    item.requestCount,
  ];
  return typeof item.id === 'string'
    && item.id.length > 0
    && ['completed', 'stopped', 'error'].includes(String(item.status))
    && numericFields.every((field) => typeof field === 'number' && Number.isFinite(field) && field >= 0);
}

export function readSessions(): DownloadSessionRecord[] {
  const value = readStorage<unknown>(SESSIONS_KEY, []);
  return Array.isArray(value) ? value.filter(isSessionRecord).slice(0, MAX_SESSIONS) : [];
}

export function clearSessions(): boolean {
  return writeStorage(SESSIONS_KEY, []);
}

export function saveSession(session: DownloadSessionRecord): boolean {
  if (!isSessionRecord(session)) return false;
  const existing = readSessions().filter((item) => item.id !== session.id);
  return writeStorage(SESSIONS_KEY, [session, ...existing].slice(0, MAX_SESSIONS));
}

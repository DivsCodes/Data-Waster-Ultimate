import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_PROFILE,
  claimReward,
  getAchievements,
  getDailyMissions,
  getLevelProgress,
  recordGameResult,
  sanitizeGameProfile,
} from './gamification';
import type { DownloadSessionRecord } from '../sessions/sessionStorage';

const now = new Date(2026, 10, 24, 12, 0, 0).getTime();
const session = (overrides: Partial<DownloadSessionRecord> = {}): DownloadSessionRecord => ({
  id: 'session-1',
  startedAt: now,
  finishedAt: now + 1000,
  status: 'completed',
  targetBytes: 1024 ** 3,
  transferredBytes: 1024 ** 3,
  elapsedMs: 30 * 60 * 1000,
  averageSpeedBps: 1024 ** 2,
  peakSpeedBps: 10 * 1024 ** 2,
  requestCount: 3,
  ...overrides,
});

describe('gamification', () => {
  it('calculates level thresholds without losing XP', () => {
    expect(getLevelProgress(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
    expect(getLevelProgress(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 150 });
    expect(getLevelProgress(125)).toMatchObject({ level: 2, xpIntoLevel: 25, progressPercent: expect.closeTo(16.67, 2) });
  });

  it('records games, best score and earned XP', () => {
    const updated = recordGameResult(DEFAULT_GAME_PROFILE, {
      id: 'game-1', gameId: 'data-clicker', score: 42, xpEarned: 13, durationMs: 20_000, playedAt: now,
    });
    expect(updated.totalXp).toBe(13);
    expect(updated.gamesPlayed).toBe(1);
    expect(updated.bestScores['data-clicker']).toBe(42);
  });

  it('does not allow the same reward to be claimed twice', () => {
    const once = claimReward(DEFAULT_GAME_PROFILE, 'mission:today:play-one', 20);
    const twice = claimReward(once, 'mission:today:play-one', 20);
    expect(once.totalXp).toBe(20);
    expect(twice.totalXp).toBe(20);
  });

  it('derives daily missions from current-day games and sessions', () => {
    const profile = recordGameResult(DEFAULT_GAME_PROFILE, {
      id: 'game-1', gameId: 'data-clicker', score: 30, xpEarned: 10, durationMs: 20_000, playedAt: now,
    });
    const missions = getDailyMissions([session({ transferredBytes: 25 * 1024 ** 2 })], profile, now);
    expect(missions.every((mission) => mission.complete)).toBe(true);
  });

  it('unlocks achievements from actual session and game records', () => {
    const profile = recordGameResult(DEFAULT_GAME_PROFILE, {
      id: 'game-1', gameId: 'signal-sprint', score: 90, xpEarned: 14, durationMs: 1500, playedAt: now,
    });
    const achievements = getAchievements([session()], profile);
    expect(achievements.find((item) => item.id === 'first-transfer')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'first-game')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'signal-elite')?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === 'data-hoarder')?.unlocked).toBe(true);
  });

  it('sanitizes corrupted persisted profile data', () => {
    const sanitized = sanitizeGameProfile({ totalXp: -1, gamesPlayed: 'many', recentGames: [{ nope: true }] });
    expect(sanitized.totalXp).toBe(0);
    expect(sanitized.gamesPlayed).toBe(0);
    expect(sanitized.recentGames).toHaveLength(0);
  });
});

import type { DownloadSessionRecord } from '../sessions/sessionStorage';
import { readStorage, writeStorage } from '../../lib/storage';

const PROFILE_KEY = 'data-waster:gamification:v1';
const MAX_RECENT_GAMES = 100;

export type GameId = 'data-clicker' | 'signal-sprint';

export interface GameResult {
  id: string;
  gameId: GameId;
  score: number;
  xpEarned: number;
  durationMs: number;
  playedAt: number;
}

export interface GameProfile {
  version: 1;
  totalXp: number;
  gamesPlayed: number;
  bestScores: Record<GameId, number>;
  recentGames: GameResult[];
  claimedRewardKeys: string[];
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  totalXp: number;
}

export interface MissionStatus {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardKey: string;
  claimed: boolean;
  complete: boolean;
}

export interface AchievementStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardXp: number;
  progress: number;
  target: number;
  unlocked: boolean;
  claimed: boolean;
}

export const DEFAULT_GAME_PROFILE: GameProfile = {
  version: 1,
  totalXp: 0,
  gamesPlayed: 0,
  bestScores: { 'data-clicker': 0, 'signal-sprint': 0 },
  recentGames: [],
  claimedRewardKeys: [],
};

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isGameResult(value: unknown): value is GameResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<GameResult>;
  return typeof result.id === 'string'
    && result.id.length > 0
    && (result.gameId === 'data-clicker' || result.gameId === 'signal-sprint')
    && isFiniteNonNegative(result.score)
    && isFiniteNonNegative(result.xpEarned)
    && isFiniteNonNegative(result.durationMs)
    && isFiniteNonNegative(result.playedAt);
}

export function sanitizeGameProfile(value: unknown): GameProfile {
  if (!value || typeof value !== 'object') return { ...DEFAULT_GAME_PROFILE, bestScores: { ...DEFAULT_GAME_PROFILE.bestScores } };
  const profile = value as Partial<GameProfile>;
  const bestScores = profile.bestScores && typeof profile.bestScores === 'object'
    ? profile.bestScores
    : DEFAULT_GAME_PROFILE.bestScores;
  return {
    version: 1,
    totalXp: isFiniteNonNegative(profile.totalXp) ? profile.totalXp : 0,
    gamesPlayed: isFiniteNonNegative(profile.gamesPlayed) ? Math.floor(profile.gamesPlayed) : 0,
    bestScores: {
      'data-clicker': isFiniteNonNegative(bestScores['data-clicker']) ? bestScores['data-clicker'] : 0,
      'signal-sprint': isFiniteNonNegative(bestScores['signal-sprint']) ? bestScores['signal-sprint'] : 0,
    },
    recentGames: Array.isArray(profile.recentGames) ? profile.recentGames.filter(isGameResult).slice(0, MAX_RECENT_GAMES) : [],
    claimedRewardKeys: Array.isArray(profile.claimedRewardKeys)
      ? profile.claimedRewardKeys.filter((key): key is string => typeof key === 'string').slice(0, 500)
      : [],
  };
}

export function readGameProfile(): GameProfile {
  return sanitizeGameProfile(readStorage<unknown>(PROFILE_KEY, DEFAULT_GAME_PROFILE));
}

export function writeGameProfile(profile: GameProfile): boolean {
  return writeStorage(PROFILE_KEY, sanitizeGameProfile(profile));
}

export function xpRequiredForLevel(level: number): number {
  return 100 + Math.max(0, Math.floor(level) - 1) * 50;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  let remainingXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let required = xpRequiredForLevel(level);
  while (remainingXp >= required && level < 10_000) {
    remainingXp -= required;
    level += 1;
    required = xpRequiredForLevel(level);
  }
  return {
    level,
    xpIntoLevel: remainingXp,
    xpForNextLevel: required,
    progressPercent: required > 0 ? Math.min(100, (remainingXp / required) * 100) : 0,
    totalXp: Math.max(0, Math.floor(totalXp)),
  };
}

export function recordGameResult(profile: GameProfile, result: GameResult): GameProfile {
  if (!isGameResult(result)) return profile;
  return sanitizeGameProfile({
    ...profile,
    totalXp: profile.totalXp + Math.floor(result.xpEarned),
    gamesPlayed: profile.gamesPlayed + 1,
    bestScores: {
      ...profile.bestScores,
      [result.gameId]: Math.max(profile.bestScores[result.gameId], result.score),
    },
    recentGames: [result, ...profile.recentGames].slice(0, MAX_RECENT_GAMES),
  });
}

export function claimReward(profile: GameProfile, rewardKey: string, rewardXp: number): GameProfile {
  if (!rewardKey || profile.claimedRewardKeys.includes(rewardKey) || !isFiniteNonNegative(rewardXp)) return profile;
  return sanitizeGameProfile({
    ...profile,
    totalXp: profile.totalXp + Math.floor(rewardXp),
    claimedRewardKeys: [...profile.claimedRewardKeys, rewardKey],
  });
}

export function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDailyMissions(
  sessions: DownloadSessionRecord[],
  profile: GameProfile,
  now = Date.now(),
): MissionStatus[] {
  const today = localDateKey(now);
  const todayGames = profile.recentGames.filter((game) => localDateKey(game.playedAt) === today);
  const clickerBestToday = todayGames
    .filter((game) => game.gameId === 'data-clicker')
    .reduce((best, game) => Math.max(best, game.score), 0);
  const transferredToday = sessions
    .filter((session) => localDateKey(session.startedAt) === today)
    .reduce((sum, session) => sum + session.transferredBytes, 0);
  const definitions = [
    { id: 'play-one', title: 'Warm up the arcade', description: 'Play any arcade game once today.', progress: todayGames.length, target: 1, rewardXp: 20 },
    { id: 'click-25', title: 'Click into action', description: 'Score 25 points in Data Clicker today.', progress: clickerBestToday, target: 25, rewardXp: 25 },
    { id: 'transfer-25mb', title: 'Move some data', description: 'Transfer 25 MB in a real download session today.', progress: transferredToday, target: 25 * 1024 ** 2, rewardXp: 30 },
  ];
  return definitions.map((mission) => {
    const rewardKey = `mission:${today}:${mission.id}`;
    return {
      ...mission,
      progress: Math.min(mission.target, mission.progress),
      rewardKey,
      claimed: profile.claimedRewardKeys.includes(rewardKey),
      complete: mission.progress >= mission.target,
    };
  });
}

export function getAchievements(
  sessions: DownloadSessionRecord[],
  profile: GameProfile,
): AchievementStatus[] {
  const totalBytes = sessions.reduce((sum, session) => sum + session.transferredBytes, 0);
  const completedSessions = sessions.filter((session) => session.status === 'completed').length;
  const highestPeakSpeed = sessions.reduce((max, session) => Math.max(max, session.peakSpeedBps), 0);
  const longestSession = sessions.reduce((max, session) => Math.max(max, session.elapsedMs), 0);
  const definitions = [
    { id: 'first-transfer', name: 'First Contact', description: 'Finish your first data-wasting session.', icon: 'radio', rewardXp: 20, progress: sessions.length, target: 1 },
    { id: 'first-game', name: 'Player One', description: 'Play your first arcade round.', icon: 'gamepad', rewardXp: 20, progress: profile.gamesPlayed, target: 1 },
    { id: 'arcade-regular', name: 'Arcade Regular', description: 'Play 10 arcade rounds.', icon: 'joystick', rewardXp: 50, progress: profile.gamesPlayed, target: 10 },
    { id: 'clicker-ace', name: 'Click Machine', description: 'Score 50 points in Data Clicker.', icon: 'mouse', rewardXp: 30, progress: profile.bestScores['data-clicker'], target: 50 },
    { id: 'signal-elite', name: 'Signal Elite', description: 'Reach 85 points in Signal Sprint.', icon: 'zap', rewardXp: 40, progress: profile.bestScores['signal-sprint'], target: 85 },
    { id: 'data-hoarder', name: 'Data Hoarder', description: 'Transfer at least 1 GB in total.', icon: 'database', rewardXp: 50, progress: totalBytes, target: 1024 ** 3 },
    { id: 'session-veteran', name: 'Session Veteran', description: 'Complete 10 download sessions.', icon: 'medal', rewardXp: 60, progress: completedSessions, target: 10 },
    { id: 'speed-demon', name: 'Speed Demon', description: 'Hit a peak speed of 10 MB/s.', icon: 'flame', rewardXp: 50, progress: highestPeakSpeed, target: 10 * 1024 ** 2 },
    { id: 'long-haul', name: 'Long Haul', description: 'Keep a session running for 30 minutes.', icon: 'timer', rewardXp: 40, progress: longestSession, target: 30 * 60 * 1000 },
  ];
  return definitions.map((achievement) => ({
    ...achievement,
    progress: Math.min(achievement.target, achievement.progress),
    unlocked: achievement.progress >= achievement.target,
    claimed: profile.claimedRewardKeys.includes(`achievement:${achievement.id}`),
  }));
}

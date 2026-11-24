import { readStorage, writeStorage } from '../../lib/storage';

const COMMUNITY_KEY = 'data-waster:community:v1';
const MAX_CONTACTS = 100;
const MAX_TEAMS = 30;
const MAX_CHALLENGES = 50;

export type ProfileVisibility = 'public' | 'private';
export type ChallengeMetric = 'xp' | 'games' | 'downloads';
export type ChallengeStatus = 'draft' | 'active' | 'complete';

export interface CommunityProfile {
  displayName: string;
  handle: string;
  bio: string;
  visibility: ProfileVisibility;
  updatedAt: number;
}

export interface CommunityContact {
  id: string;
  displayName: string;
  handle: string;
  note: string;
  addedAt: number;
}

export interface CommunityTeam {
  id: string;
  name: string;
  tag: string;
  description: string;
  createdAt: number;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  durationDays: number;
  status: ChallengeStatus;
  createdAt: number;
}

export interface CommunityData {
  version: 1;
  profile: CommunityProfile;
  contacts: CommunityContact[];
  teams: CommunityTeam[];
  challenges: CommunityChallenge[];
}

export const DEFAULT_COMMUNITY_DATA: CommunityData = {
  version: 1,
  profile: {
    displayName: 'Data Explorer',
    handle: 'data_explorer',
    bio: 'Turning bandwidth into bragging rights.',
    visibility: 'private',
    updatedAt: 0,
  },
  contacts: [],
  teams: [],
  challenges: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().replace(/[<>]/g, '').slice(0, maxLength);
}

export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export function isValidHandle(value: string): boolean {
  const candidate = value.trim().replace(/^@+/, '');
  return /^[a-zA-Z0-9_]{3,20}$/.test(candidate);
}

function validTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function makeId(prefix: string): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

function sanitizeProfile(value: unknown): CommunityProfile {
  if (!isRecord(value)) return { ...DEFAULT_COMMUNITY_DATA.profile };
  const rawHandle = typeof value.handle === 'string' ? value.handle.trim().replace(/^@+/, '') : '';
  const candidateHandle = normalizeHandle(rawHandle);
  return {
    displayName: cleanText(value.displayName, 40, DEFAULT_COMMUNITY_DATA.profile.displayName) || DEFAULT_COMMUNITY_DATA.profile.displayName,
    handle: isValidHandle(rawHandle) ? candidateHandle : DEFAULT_COMMUNITY_DATA.profile.handle,
    bio: cleanText(value.bio, 160),
    visibility: value.visibility === 'public' ? 'public' : 'private',
    updatedAt: validTimestamp(value.updatedAt),
  };
}

function sanitizeContacts(value: unknown): CommunityContact[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const contacts: CommunityContact[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const rawHandle = typeof entry.handle === 'string' ? entry.handle.trim().replace(/^@+/, '') : '';
    const handle = normalizeHandle(rawHandle);
    if (!isValidHandle(rawHandle) || seen.has(handle)) continue;
    seen.add(handle);
    contacts.push({
      id: cleanText(entry.id, 100) || makeId('contact'),
      displayName: cleanText(entry.displayName, 40) || `@${handle}`,
      handle,
      note: cleanText(entry.note, 100),
      addedAt: validTimestamp(entry.addedAt),
    });
    if (contacts.length >= MAX_CONTACTS) break;
  }
  return contacts;
}

function sanitizeTeams(value: unknown): CommunityTeam[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).slice(0, MAX_TEAMS).map((entry) => ({
    id: cleanText(entry.id, 100) || makeId('team'),
    name: cleanText(entry.name, 40) || 'Unnamed team',
    tag: cleanText(entry.tag, 6).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    description: cleanText(entry.description, 160),
    createdAt: validTimestamp(entry.createdAt),
  }));
}

function sanitizeChallenges(value: unknown): CommunityChallenge[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).slice(0, MAX_CHALLENGES).map((entry) => ({
    id: cleanText(entry.id, 100) || makeId('challenge'),
    title: cleanText(entry.title, 60) || 'Untitled challenge',
    metric: entry.metric === 'games' || entry.metric === 'downloads' ? entry.metric : 'xp',
    target: typeof entry.target === 'number' && Number.isFinite(entry.target) ? Math.min(1_000_000_000, Math.max(1, Math.floor(entry.target))) : 100,
    durationDays: typeof entry.durationDays === 'number' && Number.isFinite(entry.durationDays) ? Math.min(90, Math.max(1, Math.floor(entry.durationDays))) : 7,
    status: entry.status === 'active' || entry.status === 'complete' ? entry.status : 'draft',
    createdAt: validTimestamp(entry.createdAt),
  }));
}

export function sanitizeCommunityData(value: unknown): CommunityData {
  if (!isRecord(value)) return {
    ...DEFAULT_COMMUNITY_DATA,
    profile: { ...DEFAULT_COMMUNITY_DATA.profile },
    contacts: [], teams: [], challenges: [],
  };
  return {
    version: 1,
    profile: sanitizeProfile(value.profile),
    contacts: sanitizeContacts(value.contacts),
    teams: sanitizeTeams(value.teams),
    challenges: sanitizeChallenges(value.challenges),
  };
}

export function readCommunityData(): CommunityData {
  return sanitizeCommunityData(readStorage<unknown>(COMMUNITY_KEY, DEFAULT_COMMUNITY_DATA));
}

export function writeCommunityData(data: CommunityData): boolean {
  return writeStorage(COMMUNITY_KEY, sanitizeCommunityData(data));
}

export function updateProfile(data: CommunityData, updates: Partial<CommunityProfile>): CommunityData | null {
  const rawHandle = updates.handle ?? data.profile.handle;
  if (!isValidHandle(rawHandle)) return null;
  const requestedHandle = normalizeHandle(rawHandle);
  const next = sanitizeProfile({ ...data.profile, ...updates, handle: requestedHandle, updatedAt: Date.now() });
  return sanitizeCommunityData({ ...data, profile: next });
}

export function addContact(data: CommunityData, input: { displayName: string; handle: string; note?: string }): CommunityData | null {
  if (!isValidHandle(input.handle)) return null;
  const handle = normalizeHandle(input.handle);
  if (data.contacts.some((contact) => contact.handle === handle) || handle === data.profile.handle) return null;
  const contact: CommunityContact = {
    id: makeId('contact'),
    displayName: cleanText(input.displayName, 40) || `@${handle}`,
    handle,
    note: cleanText(input.note, 100),
    addedAt: Date.now(),
  };
  return sanitizeCommunityData({ ...data, contacts: [contact, ...data.contacts] });
}

export function removeContact(data: CommunityData, id: string): CommunityData {
  return sanitizeCommunityData({ ...data, contacts: data.contacts.filter((contact) => contact.id !== id) });
}

export function addTeam(data: CommunityData, input: { name: string; tag: string; description?: string }): CommunityData | null {
  const name = cleanText(input.name, 40);
  const tag = cleanText(input.tag, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!name || data.teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) return null;
  const team: CommunityTeam = { id: makeId('team'), name, tag, description: cleanText(input.description, 160), createdAt: Date.now() };
  return sanitizeCommunityData({ ...data, teams: [team, ...data.teams] });
}

export function removeTeam(data: CommunityData, id: string): CommunityData {
  return sanitizeCommunityData({ ...data, teams: data.teams.filter((team) => team.id !== id) });
}

export function addChallenge(data: CommunityData, input: { title: string; metric: ChallengeMetric; target: number; durationDays: number }): CommunityData | null {
  const title = cleanText(input.title, 60);
  if (!title || !Number.isFinite(input.target) || input.target < 1 || !Number.isFinite(input.durationDays) || input.durationDays < 1) return null;
  const challenge: CommunityChallenge = {
    id: makeId('challenge'),
    title,
    metric: input.metric,
    target: Math.min(1_000_000_000, Math.floor(input.target)),
    durationDays: Math.min(90, Math.max(1, Math.floor(input.durationDays))),
    status: 'draft',
    createdAt: Date.now(),
  };
  return sanitizeCommunityData({ ...data, challenges: [challenge, ...data.challenges] });
}

export function updateChallengeStatus(data: CommunityData, id: string, status: ChallengeStatus): CommunityData {
  return sanitizeCommunityData({
    ...data,
    challenges: data.challenges.map((challenge) => challenge.id === id ? { ...challenge, status } : challenge),
  });
}

export function removeChallenge(data: CommunityData, id: string): CommunityData {
  return sanitizeCommunityData({ ...data, challenges: data.challenges.filter((challenge) => challenge.id !== id) });
}

export function exportCommunityProfile(profile: CommunityProfile): string {
  return JSON.stringify({
    product: 'Data Waster 4.0',
    profile: sanitizeProfile(profile),
    exportedAt: new Date().toISOString(),
    note: 'This is a profile card export, not a hosted or verified community account.',
  }, null, 2);
}

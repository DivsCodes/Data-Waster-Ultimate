import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMUNITY_DATA,
  addChallenge,
  addContact,
  addTeam,
  isValidHandle,
  normalizeHandle,
  sanitizeCommunityData,
  updateChallengeStatus,
  updateProfile,
} from './community';

describe('community local workspace', () => {
  it('normalizes and validates handles', () => {
    expect(normalizeHandle(' @Divs.Codes ')).toBe('divscodes');
    expect(isValidHandle('data_waster')).toBe(true);
    expect(isValidHandle('ab')).toBe(false);
  });

  it('sanitizes invalid or legacy local data safely', () => {
    const value = sanitizeCommunityData({ profile: { handle: '<script>', visibility: 'world' }, contacts: [{ handle: 'ok_user' }, { handle: 'ok_user' }] });
    expect(value.profile.handle).toBe(DEFAULT_COMMUNITY_DATA.profile.handle);
    expect(value.profile.visibility).toBe('private');
    expect(value.contacts).toHaveLength(1);
  });

  it('rejects duplicate contacts and self-contact', () => {
    const first = addContact(DEFAULT_COMMUNITY_DATA, { displayName: 'One', handle: 'friend_one' });
    expect(first).not.toBeNull();
    expect(addContact(first!, { displayName: 'Duplicate', handle: '@FRIEND_ONE' })).toBeNull();
    expect(addContact(first!, { displayName: 'Self', handle: first!.profile.handle })).toBeNull();
  });

  it('updates profiles and blocks invalid handles', () => {
    expect(updateProfile(DEFAULT_COMMUNITY_DATA, { displayName: 'Divs', handle: 'divs_42' })?.profile.displayName).toBe('Divs');
    expect(updateProfile(DEFAULT_COMMUNITY_DATA, { handle: 'x' })).toBeNull();
  });

  it('creates teams and rejects duplicate names', () => {
    const first = addTeam(DEFAULT_COMMUNITY_DATA, { name: 'Packet Crew', tag: 'pc' });
    expect(first?.teams[0].tag).toBe('PC');
    expect(addTeam(first!, { name: 'packet crew', tag: 'again' })).toBeNull();
  });

  it('creates challenge drafts and updates their status', () => {
    const first = addChallenge(DEFAULT_COMMUNITY_DATA, { title: 'Earn XP', metric: 'xp', target: 500, durationDays: 7 });
    expect(first?.challenges[0].status).toBe('draft');
    const active = updateChallengeStatus(first!, first!.challenges[0].id, 'active');
    expect(active.challenges[0].status).toBe('active');
    expect(addChallenge(DEFAULT_COMMUNITY_DATA, { title: 'Bad', metric: 'xp', target: 0, durationDays: 2 })).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { readStorage, removeStorage, writeStorage } from './storage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('local storage helpers', () => {
  it('writes and reads typed JSON values', () => {
    const settings = { theme: 'dark', compact: false };
    expect(writeStorage('settings', settings)).toBe(true);
    expect(readStorage('settings', { theme: 'light', compact: true })).toEqual(settings);
  });

  it('returns the fallback when a key is missing or invalid', () => {
    expect(readStorage('missing', 42)).toBe(42);
    window.localStorage.setItem('broken', '{not json');
    expect(readStorage('broken', 'fallback')).toBe('fallback');
  });

  it('removes a stored value', () => {
    writeStorage('temporary', 'value');
    expect(removeStorage('temporary')).toBe(true);
    expect(readStorage('temporary', null)).toBeNull();
  });
});

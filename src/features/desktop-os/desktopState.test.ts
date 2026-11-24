import { describe, expect, it } from 'vitest';
import {
  clampWindowRect,
  createDesktopWindow,
  focusDesktopWindow,
  isDesktopAppId,
  normalizeDesktopPreferences,
  toggleDesktopWindowMaximize,
} from './desktopState';

describe('desktop OS state helpers', () => {
  it('recognizes the new Community app in the desktop launcher model', () => {
    expect(isDesktopAppId('community')).toBe(true);
    expect(isDesktopAppId('tools')).toBe(true);
    expect(isDesktopAppId('not-an-app')).toBe(false);
  });

  it('normalizes invalid persisted desktop preferences', () => {
    expect(normalizeDesktopPreferences({ wallpaper: 'unknown', showWidgets: 'yes' })).toEqual({
      wallpaper: 'aurora', showWidgets: true, showDesktopIcons: true,
    });
  });

  it('clamps a window into available desktop bounds', () => {
    expect(clampWindowRect({ x: 900, y: -20, width: 900, height: 900 }, { width: 800, height: 600 })).toEqual({
      x: 8, y: 8, width: 784, height: 584,
    });
  });

  it('creates a visible window on small screens', () => {
    const item = createDesktopWindow('dashboard', 0, 10, { width: 360, height: 500 });
    expect(item.width).toBe(336);
    expect(item.height).toBe(470);
    expect(item.minimized).toBe(false);
  });

  it('restores a maximized window to its previous geometry', () => {
    const original = createDesktopWindow('dashboard', 0, 10, { width: 1200, height: 800 });
    const maximized = toggleDesktopWindowMaximize(original, { width: 1200, height: 800 });
    const restored = toggleDesktopWindowMaximize(maximized, { width: 1200, height: 800 });
    expect(restored).toMatchObject({ x: original.x, y: original.y, width: original.width, height: original.height, maximized: false });
  });

  it('brings a selected window forward and restores it from minimized state', () => {
    const first = createDesktopWindow('dashboard', 0, 10, { width: 1000, height: 700 });
    const second = createDesktopWindow('arcade', 1, 11, { width: 1000, height: 700 });
    const focused = focusDesktopWindow([{ ...first, minimized: true }, second], 'dashboard', 12);
    expect(focused[0]).toMatchObject({ zIndex: 12, minimized: false });
    expect(focused[1].zIndex).toBe(11);
  });
});

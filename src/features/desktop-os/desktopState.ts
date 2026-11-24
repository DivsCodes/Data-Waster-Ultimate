import { readStorage, writeStorage } from '../../lib/storage';

export type DesktopWallpaper = 'aurora' | 'midnight' | 'grid' | 'sunset';

export interface DesktopPreferences {
  wallpaper: DesktopWallpaper;
  showWidgets: boolean;
  showDesktopIcons: boolean;
}

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DesktopAppId =
  | 'dashboard'
  | 'laboratory'
  | 'analytics'
  | 'arcade'
  | 'customize'
  | 'settings'
  | 'community'
  | 'tools'
  | 'explorer'
  | 'help';

export interface DesktopWindowState extends WindowRect {
  id: DesktopAppId;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  restoreRect?: WindowRect;
}

export interface DesktopBounds {
  width: number;
  height: number;
}

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  wallpaper: 'aurora',
  showWidgets: true,
  showDesktopIcons: true,
};

const DESKTOP_PREFERENCES_KEY = 'data-waster:desktop-preferences:v1';
const WALLPAPERS: DesktopWallpaper[] = ['aurora', 'midnight', 'grid', 'sunset'];
const APP_IDS: DesktopAppId[] = [
  'dashboard', 'laboratory', 'analytics', 'arcade', 'customize', 'settings', 'community', 'tools', 'explorer', 'help',
];

export function normalizeDesktopPreferences(value: unknown): DesktopPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DESKTOP_PREFERENCES };
  const candidate = value as Partial<DesktopPreferences>;
  return {
    wallpaper: WALLPAPERS.includes(candidate.wallpaper as DesktopWallpaper)
      ? candidate.wallpaper as DesktopWallpaper
      : DEFAULT_DESKTOP_PREFERENCES.wallpaper,
    showWidgets: typeof candidate.showWidgets === 'boolean'
      ? candidate.showWidgets
      : DEFAULT_DESKTOP_PREFERENCES.showWidgets,
    showDesktopIcons: typeof candidate.showDesktopIcons === 'boolean'
      ? candidate.showDesktopIcons
      : DEFAULT_DESKTOP_PREFERENCES.showDesktopIcons,
  };
}

export function readDesktopPreferences(): DesktopPreferences {
  return normalizeDesktopPreferences(readStorage<unknown>(DESKTOP_PREFERENCES_KEY, DEFAULT_DESKTOP_PREFERENCES));
}

export function writeDesktopPreferences(preferences: DesktopPreferences): boolean {
  return writeStorage(DESKTOP_PREFERENCES_KEY, normalizeDesktopPreferences(preferences));
}

export function isDesktopAppId(value: unknown): value is DesktopAppId {
  return typeof value === 'string' && APP_IDS.includes(value as DesktopAppId);
}

export function clampWindowRect(rect: WindowRect, bounds: DesktopBounds): WindowRect {
  const maxWidth = Math.max(240, bounds.width - 16);
  const maxHeight = Math.max(190, bounds.height - 16);
  const width = Math.min(Math.max(240, Number.isFinite(rect.width) ? rect.width : 620), maxWidth);
  const height = Math.min(Math.max(190, Number.isFinite(rect.height) ? rect.height : 430), maxHeight);
  const x = Math.min(Math.max(8, Number.isFinite(rect.x) ? rect.x : 8), Math.max(8, bounds.width - width - 8));
  const y = Math.min(Math.max(8, Number.isFinite(rect.y) ? rect.y : 8), Math.max(8, bounds.height - height - 8));
  return { x, y, width, height };
}

export function createDesktopWindow(
  id: DesktopAppId,
  ordinal: number,
  zIndex: number,
  bounds: DesktopBounds,
): DesktopWindowState {
  const width = Math.min(680, Math.max(240, bounds.width - 24));
  const height = Math.min(470, Math.max(190, bounds.height - 24));
  const offset = (Math.max(0, ordinal) % 6) * 26;
  const rect = clampWindowRect({
    x: Math.max(8, (bounds.width - width) / 2 + offset),
    y: Math.max(8, (bounds.height - height) / 2 + offset),
    width,
    height,
  }, bounds);
  return { id, ...rect, zIndex, minimized: false, maximized: false };
}

export function focusDesktopWindow(
  windows: DesktopWindowState[],
  id: DesktopAppId,
  zIndex: number,
): DesktopWindowState[] {
  return windows.map((item) => item.id === id
    ? { ...item, zIndex, minimized: false }
    : item);
}

export function toggleDesktopWindowMaximize(
  item: DesktopWindowState,
  bounds: DesktopBounds,
): DesktopWindowState {
  if (item.maximized) {
    const restored = clampWindowRect(item.restoreRect ?? {
      x: 24, y: 24, width: 620, height: 430,
    }, bounds);
    return { ...item, ...restored, maximized: false, restoreRect: undefined };
  }
  return {
    ...item,
    x: 0,
    y: 0,
    width: Math.max(240, bounds.width),
    height: Math.max(190, bounds.height),
    maximized: true,
    restoreRect: { x: item.x, y: item.y, width: item.width, height: item.height },
  };
}

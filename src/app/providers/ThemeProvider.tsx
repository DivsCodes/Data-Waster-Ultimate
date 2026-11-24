import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { readStorage, writeStorage } from '../../lib/storage';
import { getAccentPalette, normalizeAppSettings } from '../../features/customization/customization';
import { playSoundPreview } from '../../features/customization/soundEffects';
import { DEFAULT_SETTINGS, type AppSettings, type ThemeMode } from '../../types/settings';

const SETTINGS_KEY = 'data-waster:settings:v1';

interface ThemeContextValue {
  settings: AppSettings;
  setTheme: (theme: ThemeMode) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialSettings(): AppSettings {
  return normalizeAppSettings(readStorage<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS));
}

function applyDocumentSettings(settings: AppSettings) {
  const colorScheme = window.matchMedia?.('(prefers-color-scheme: light)');
  const resolvedTheme = settings.theme === 'system'
    ? (colorScheme?.matches ? 'light' : 'dark')
    : settings.theme;
  const palette = getAccentPalette(settings.accentColor, resolvedTheme);
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
  root.dataset.effect = settings.effectMode;
  root.dataset.wallpaper = settings.backgroundStyle;
  root.dataset.navigation = settings.compactNavigation ? 'compact' : 'normal';
  root.style.setProperty('--color-accent', palette.accent);
  root.style.setProperty('--color-accent-strong', palette.strong);
  root.style.setProperty('--color-accent-soft', palette.soft);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);

  useEffect(() => {
    applyDocumentSettings(settings);
    writeStorage(SETTINGS_KEY, settings);

    if (settings.theme !== 'system' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSchemeChange = () => applyDocumentSettings(settings);
    mediaQuery.addEventListener?.('change', handleSchemeChange);
    return () => mediaQuery.removeEventListener?.('change', handleSchemeChange);
  }, [settings]);

  useEffect(() => {
    if (!settings.soundEffects) return undefined;
    const handleUiSound = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('button, a[role="button"]');
      if (!control || control.hasAttribute('disabled') || control.getAttribute('data-sound') === 'off') return;
      void playSoundPreview(settings.soundStyle, settings.soundVolume);
    };
    document.addEventListener('click', handleUiSound);
    return () => document.removeEventListener('click', handleUiSound);
  }, [settings.soundEffects, settings.soundStyle, settings.soundVolume]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((current) => normalizeAppSettings({ ...current, ...updates }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    updateSettings({ theme });
  }, [updateSettings]);

  const resetSettings = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), []);
  const value = useMemo(() => ({ settings, setTheme, updateSettings, resetSettings }), [settings, setTheme, updateSettings, resetSettings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppSettings must be used inside ThemeProvider');
  return context;
}

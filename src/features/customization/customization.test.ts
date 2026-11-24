import { describe, expect, it } from 'vitest';
import { ACCENT_PALETTES, CUSTOMIZATION_PRESETS, getAccentPalette, normalizeAppSettings } from './customization';
import { DEFAULT_SETTINGS } from '../../types/settings';

describe('customization settings', () => {
  it('keeps defaults when no saved settings exist', () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates Phase 1 settings and supplies Phase 7 defaults', () => {
    expect(normalizeAppSettings({ theme: 'light', reducedMotion: true })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      reducedMotion: true,
    });
  });

  it('rejects unknown option values and clamps sound volume', () => {
    const normalized = normalizeAppSettings({ accentColor: 'ultraviolet', effectMode: 'laser', backgroundStyle: 'space', soundStyle: 'bass', soundVolume: 180 });
    expect(normalized.accentColor).toBe(DEFAULT_SETTINGS.accentColor);
    expect(normalized.effectMode).toBe(DEFAULT_SETTINGS.effectMode);
    expect(normalized.backgroundStyle).toBe(DEFAULT_SETTINGS.backgroundStyle);
    expect(normalized.soundStyle).toBe(DEFAULT_SETTINGS.soundStyle);
    expect(normalized.soundVolume).toBe(100);
  });

  it('provides dark and light accent variants for every palette', () => {
    expect(Object.keys(ACCENT_PALETTES)).toHaveLength(5);
    expect(getAccentPalette('cyan', 'dark').accent).toBe('#70d7f5');
    expect(getAccentPalette('cyan', 'light').accent).toBe('#087d9e');
  });

  it('keeps all presets mapped to valid settings values', () => {
    expect(CUSTOMIZATION_PRESETS).toHaveLength(5);
    for (const preset of CUSTOMIZATION_PRESETS) {
      const result = normalizeAppSettings(preset);
      expect(result.accentColor).toBe(preset.accentColor);
      expect(result.effectMode).toBe(preset.effectMode);
      expect(result.backgroundStyle).toBe(preset.backgroundStyle);
    }
  });
});

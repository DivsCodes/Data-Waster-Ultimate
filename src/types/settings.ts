export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'mint' | 'cyan' | 'violet' | 'amber' | 'rose';
export type EffectMode = 'off' | 'matrix' | 'glitch' | 'nuclear';
export type BackgroundStyle = 'aurora' | 'grid' | 'stars' | 'plain';
export type SoundStyle = 'soft' | 'arcade' | 'sci-fi';

export interface AppSettings {
  theme: ThemeMode;
  reducedMotion: boolean;
  compactNavigation: boolean;
  accentColor: AccentColor;
  effectMode: EffectMode;
  backgroundStyle: BackgroundStyle;
  soundEffects: boolean;
  soundStyle: SoundStyle;
  soundVolume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  reducedMotion: false,
  compactNavigation: false,
  accentColor: 'mint',
  effectMode: 'off',
  backgroundStyle: 'aurora',
  soundEffects: false,
  soundStyle: 'soft',
  soundVolume: 45,
};

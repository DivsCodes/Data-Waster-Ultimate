import {
  DEFAULT_SETTINGS,
  type AccentColor,
  type AppSettings,
  type BackgroundStyle,
  type EffectMode,
  type SoundStyle,
  type ThemeMode,
} from '../../types/settings';

export interface AccentPalette {
  dark: { accent: string; strong: string; soft: string };
  light: { accent: string; strong: string; soft: string };
}

export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  mint: {
    dark: { accent: '#69e6aa', strong: '#35c982', soft: 'rgba(105, 230, 170, .12)' },
    light: { accent: '#168b5a', strong: '#087647', soft: 'rgba(22, 139, 90, .10)' },
  },
  cyan: {
    dark: { accent: '#70d7f5', strong: '#32b9df', soft: 'rgba(112, 215, 245, .13)' },
    light: { accent: '#087d9e', strong: '#05627e', soft: 'rgba(8, 125, 158, .10)' },
  },
  violet: {
    dark: { accent: '#bea7ff', strong: '#9879eb', soft: 'rgba(190, 167, 255, .14)' },
    light: { accent: '#7350c5', strong: '#5b3ba7', soft: 'rgba(115, 80, 197, .10)' },
  },
  amber: {
    dark: { accent: '#f4c879', strong: '#dfa744', soft: 'rgba(244, 200, 121, .13)' },
    light: { accent: '#99600a', strong: '#7c4d06', soft: 'rgba(153, 96, 10, .10)' },
  },
  rose: {
    dark: { accent: '#ff91ad', strong: '#e9678c', soft: 'rgba(255, 145, 173, .13)' },
    light: { accent: '#bb4267', strong: '#98314f', soft: 'rgba(187, 66, 103, .10)' },
  },
};

export interface CustomizationPreset {
  id: string;
  name: string;
  description: string;
  accentColor: AccentColor;
  effectMode: EffectMode;
  backgroundStyle: BackgroundStyle;
}

export const CUSTOMIZATION_PRESETS: CustomizationPreset[] = [
  {
    id: 'mint-matrix',
    name: 'Mint Matrix',
    description: 'Classic green terminal energy with a subtle grid.',
    accentColor: 'mint',
    effectMode: 'matrix',
    backgroundStyle: 'grid',
  },
  {
    id: 'arctic-pulse',
    name: 'Arctic Pulse',
    description: 'Cool cyan highlights with a soft aurora backdrop.',
    accentColor: 'cyan',
    effectMode: 'off',
    backgroundStyle: 'aurora',
  },
  {
    id: 'violet-glitch',
    name: 'Violet Glitch',
    description: 'A vivid violet interface with restrained glitch lines.',
    accentColor: 'violet',
    effectMode: 'glitch',
    backgroundStyle: 'stars',
  },
  {
    id: 'nuclear-core',
    name: 'Nuclear Core',
    description: 'Warm amber controls with a reactor-inspired pulse.',
    accentColor: 'amber',
    effectMode: 'nuclear',
    backgroundStyle: 'grid',
  },
  {
    id: 'rose-neon',
    name: 'Rose Neon',
    description: 'A softer neon palette with a clean atmospheric glow.',
    accentColor: 'rose',
    effectMode: 'off',
    backgroundStyle: 'aurora',
  },
];

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === 'string' && values.includes(value as T);

export function normalizeAppSettings(input: unknown): AppSettings {
  const source = input && typeof input === 'object' ? input as Partial<Record<keyof AppSettings, unknown>> : {};
  const theme: ThemeMode = isOneOf(source.theme, ['dark', 'light', 'system']) ? source.theme : DEFAULT_SETTINGS.theme;
  const accentColor: AccentColor = isOneOf(source.accentColor, ['mint', 'cyan', 'violet', 'amber', 'rose']) ? source.accentColor : DEFAULT_SETTINGS.accentColor;
  const effectMode: EffectMode = isOneOf(source.effectMode, ['off', 'matrix', 'glitch', 'nuclear']) ? source.effectMode : DEFAULT_SETTINGS.effectMode;
  const backgroundStyle: BackgroundStyle = isOneOf(source.backgroundStyle, ['aurora', 'grid', 'stars', 'plain']) ? source.backgroundStyle : DEFAULT_SETTINGS.backgroundStyle;
  const soundStyle: SoundStyle = isOneOf(source.soundStyle, ['soft', 'arcade', 'sci-fi']) ? source.soundStyle : DEFAULT_SETTINGS.soundStyle;
  const soundVolume = typeof source.soundVolume === 'number' && Number.isFinite(source.soundVolume)
    ? Math.max(0, Math.min(100, Math.round(source.soundVolume)))
    : DEFAULT_SETTINGS.soundVolume;

  return {
    theme,
    reducedMotion: typeof source.reducedMotion === 'boolean' ? source.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    compactNavigation: typeof source.compactNavigation === 'boolean' ? source.compactNavigation : DEFAULT_SETTINGS.compactNavigation,
    accentColor,
    effectMode,
    backgroundStyle,
    soundEffects: typeof source.soundEffects === 'boolean' ? source.soundEffects : DEFAULT_SETTINGS.soundEffects,
    soundStyle,
    soundVolume,
  };
}

export function getAccentPalette(accent: AccentColor, resolvedTheme: 'dark' | 'light') {
  return ACCENT_PALETTES[accent][resolvedTheme];
}

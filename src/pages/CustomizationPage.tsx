import { useState, type CSSProperties } from 'react';
import {
  Check,
  Flame,
  Grid,
  Moon,
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { getAccentPalette, CUSTOMIZATION_PRESETS } from '../features/customization/customization';
import { playSoundPreview } from '../features/customization/soundEffects';
import { useAppSettings } from '../app/providers/ThemeProvider';
import type { AccentColor, BackgroundStyle, EffectMode, SoundStyle } from '../types/settings';

const accentOptions: { id: AccentColor; label: string; color: string }[] = [
  { id: 'mint', label: 'Mint', color: '#69e6aa' },
  { id: 'cyan', label: 'Cyan', color: '#70d7f5' },
  { id: 'violet', label: 'Violet', color: '#bea7ff' },
  { id: 'amber', label: 'Amber', color: '#f4c879' },
  { id: 'rose', label: 'Rose', color: '#ff91ad' },
];

const effectOptions: { id: EffectMode; label: string; description: string; icon: typeof Sparkles }[] = [
  { id: 'off', label: 'Clean', description: 'No extra overlay. Best for focus.', icon: Check },
  { id: 'matrix', label: 'Matrix', description: 'Subtle terminal scan lines.', icon: Grid },
  { id: 'glitch', label: 'Glitch', description: 'Occasional chromatic signal flicker.', icon: Zap },
  { id: 'nuclear', label: 'Nuclear', description: 'Warm reactor glow and pulse.', icon: Flame },
];

const backgroundOptions: { id: BackgroundStyle; label: string; description: string; icon: typeof Waves }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Soft atmospheric color fields.', icon: Waves },
  { id: 'grid', label: 'Grid', description: 'A subtle technical grid.', icon: Grid },
  { id: 'stars', label: 'Starlight', description: 'A quiet field of distant points.', icon: Star },
  { id: 'plain', label: 'Plain', description: 'No decorative background.', icon: Check },
];

const soundOptions: { id: SoundStyle; label: string; description: string }[] = [
  { id: 'soft', label: 'Soft UI', description: 'Gentle two-note confirmation.' },
  { id: 'arcade', label: 'Arcade', description: 'Bright retro game tones.' },
  { id: 'sci-fi', label: 'Sci-fi', description: 'A short, futuristic chime.' },
];

export function CustomizationPage() {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const [soundPreviewing, setSoundPreviewing] = useState(false);
  const isLight = settings.theme === 'light' || (settings.theme === 'system' && Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches));
  const previewPalette = getAccentPalette(settings.accentColor, isLight ? 'light' : 'dark');
  const previewStyle: CSSProperties & { '--preview-accent': string } = {
    '--preview-accent': previewPalette.accent,
  };

  const playPreview = async (style: SoundStyle = settings.soundStyle) => {
    setSoundPreviewing(true);
    await playSoundPreview(style, settings.soundVolume);
    window.setTimeout(() => setSoundPreviewing(false), 420);
  };

  const applyPreset = (presetId: string) => {
    const preset = CUSTOMIZATION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    updateSettings({
      accentColor: preset.accentColor,
      effectMode: preset.effectMode,
      backgroundStyle: preset.backgroundStyle,
    });
  };

  return (
    <div className="page-stack customize-page">
      <PageHeading
        eyebrow="PHASE 7 · VISUAL LAB"
        title="Make the interface yours."
        description="Choose a visual identity, tune ambient effects, and preview the result instantly. Everything is saved in this browser."
        action={<button className="button button--quiet" type="button" onClick={resetSettings}><RotateCcw size={14} /> Reset all</button>}
      />

      <section className="customize-hero">
        <div className="customize-hero__copy">
          <span className="customize-eyebrow"><Sparkles size={13} /> PERSONAL STYLE CONFIGURATOR</span>
          <h2>Your workspace.<br /><span>Your atmosphere.</span></h2>
          <p>Start with a preset or mix your own accent, background and visual effects. Changes apply immediately across the app.</p>
          <div className="customize-hero__meta">
            <span><Check size={13} /> Live preview</span>
            <span><Check size={13} /> Saved locally</span>
            <span><Check size={13} /> Motion-aware</span>
          </div>
        </div>
        <div className={`customize-hero__orb customize-hero__orb--${settings.effectMode}`} aria-hidden="true">
          <div className="customize-orb__ring customize-orb__ring--outer" />
          <div className="customize-orb__ring customize-orb__ring--inner" />
          <div className="customize-orb__core"><Zap size={30} fill="currentColor" /></div>
          <span>DW / 07</span>
        </div>
      </section>

      <section className="customize-section">
        <div className="customize-section__heading">
          <div><p className="eyebrow">QUICK START</p><h2>Style presets</h2><p>One click applies a coordinated accent, effect and background.</p></div>
          <Palette size={19} />
        </div>
        <div className="customize-presets">
          {CUSTOMIZATION_PRESETS.map((preset) => {
            const active = settings.accentColor === preset.accentColor && settings.effectMode === preset.effectMode && settings.backgroundStyle === preset.backgroundStyle;
            return (
              <button key={preset.id} type="button" className={`customize-preset${active ? ' customize-preset--active' : ''}`} onClick={() => applyPreset(preset.id)} aria-pressed={active}>
                <span className={`customize-preset__swatch customize-preset__swatch--${preset.accentColor}`} />
                <span className="customize-preset__copy"><strong>{preset.name}</strong><small>{preset.description}</small></span>
                {active && <Check size={15} className="customize-preset__check" />}
              </button>
            );
          })}
        </div>
      </section>

      <div className="customize-columns">
        <section className="customize-section">
          <div className="customize-section__heading">
            <div><p className="eyebrow">COLOR SYSTEM</p><h2>Accent color</h2><p>Updates buttons, highlights, charts and active navigation.</p></div>
            <Palette size={19} />
          </div>
          <div className="customize-accent-options" role="group" aria-label="Accent color">
            {accentOptions.map((option) => (
              <button key={option.id} type="button" className={`customize-accent${settings.accentColor === option.id ? ' customize-accent--selected' : ''}`} onClick={() => updateSettings({ accentColor: option.id })} aria-pressed={settings.accentColor === option.id}>
                <span className="customize-accent__dot" style={{ background: option.color, color: option.color }} />
                <span>{option.label}</span>
                {settings.accentColor === option.id && <Check size={13} />}
              </button>
            ))}
          </div>
          <div className="customize-preview" style={previewStyle}>
            <div className="customize-preview__top"><span>LIVE COMPONENT PREVIEW</span><span className="customize-preview__status"><i /> ACTIVE</span></div>
            <div className="customize-preview__body">
              <div><small>TRANSFER TARGET</small><strong>1.00 GB</strong></div>
              <div className="customize-preview__bar"><span /></div>
              <div className="customize-preview__actions"><span>Dashboard card</span><span className="customize-preview__button">Primary action <Zap size={12} /></span></div>
            </div>
          </div>
        </section>

        <section className="customize-section">
          <div className="customize-section__heading">
            <div><p className="eyebrow">AMBIENT LAYER</p><h2>Background style</h2><p>Set the atmosphere behind your workspace panels.</p></div>
            <Waves size={19} />
          </div>
          <div className="customize-choice-list">
            {backgroundOptions.map(({ id, label, description, icon: Icon }) => (
              <button key={id} type="button" className={`customize-choice${settings.backgroundStyle === id ? ' customize-choice--selected' : ''}`} onClick={() => updateSettings({ backgroundStyle: id })} aria-pressed={settings.backgroundStyle === id}>
                <span className="customize-choice__icon"><Icon size={16} /></span>
                <span className="customize-choice__copy"><strong>{label}</strong><small>{description}</small></span>
                <span className="customize-choice__radio" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="customize-section">
        <div className="customize-section__heading">
          <div><p className="eyebrow">VISUAL FX</p><h2>Effect mode</h2><p>Effects are decorative only. Reduce Motion always takes priority.</p></div>
          <Sparkles size={19} />
        </div>
        <div className="customize-effects-grid">
          {effectOptions.map(({ id, label, description, icon: Icon }) => (
            <button key={id} type="button" className={`customize-effect-card customize-effect-card--${id}${settings.effectMode === id ? ' customize-effect-card--selected' : ''}`} onClick={() => updateSettings({ effectMode: id })} aria-pressed={settings.effectMode === id}>
              <span className="customize-effect-card__icon"><Icon size={20} /></span>
              <strong>{label}</strong>
              <small>{description}</small>
              {settings.effectMode === id && <span className="customize-effect-card__active"><Check size={11} /> ACTIVE</span>}
            </button>
          ))}
        </div>
        {settings.effectMode !== 'off' && settings.reducedMotion && (
          <p className="customize-inline-note"><Moon size={13} /> Reduce motion is enabled, so animated parts of this effect are softened or disabled.</p>
        )}
      </section>

      <div className="customize-columns">
        <section className="customize-section">
          <div className="customize-section__heading">
            <div><p className="eyebrow">SOUND DESIGN</p><h2>Interface soundboard</h2><p>Optional, synthesized interface chimes. No audio files are downloaded.</p></div>
            {settings.soundEffects ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </div>
          <label className="customize-toggle-row">
            <span><strong>Enable interface sounds</strong><small>Sound previews remain available below.</small></span>
            <input type="checkbox" checked={settings.soundEffects} onChange={(event) => updateSettings({ soundEffects: event.target.checked })} />
          </label>
          <div className="customize-sound-options">
            {soundOptions.map((option) => (
              <button key={option.id} type="button" className={`customize-sound-option${settings.soundStyle === option.id ? ' customize-sound-option--selected' : ''}`} onClick={() => updateSettings({ soundStyle: option.id })} aria-pressed={settings.soundStyle === option.id}>
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
                {settings.soundStyle === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="customize-volume-row">
            <label htmlFor="sound-volume">Preview volume</label>
            <input id="sound-volume" type="range" min="0" max="100" step="5" value={settings.soundVolume} onChange={(event) => updateSettings({ soundVolume: Number(event.target.value) })} />
            <output htmlFor="sound-volume">{settings.soundVolume}%</output>
          </div>
          <button className="button button--primary customize-play-button" type="button" data-sound="off" onClick={() => void playPreview()} disabled={soundPreviewing}>
            <Play size={13} fill="currentColor" /> {soundPreviewing ? 'Playing preview…' : 'Preview selected sound'}
          </button>
        </section>

        <section className="customize-section">
          <div className="customize-section__heading">
            <div><p className="eyebrow">MOTION & COMFORT</p><h2>Accessibility controls</h2><p>Keep the workspace comfortable on different devices.</p></div>
          </div>
          <label className="customize-toggle-row">
            <span><strong>Reduce motion</strong><small>Disable decorative animation and smooth transitions.</small></span>
            <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => updateSettings({ reducedMotion: event.target.checked })} />
          </label>
          <label className="customize-toggle-row">
            <span><strong>Compact navigation</strong><small>Use a narrower sidebar on larger screens.</small></span>
            <input type="checkbox" checked={settings.compactNavigation} onChange={(event) => updateSettings({ compactNavigation: event.target.checked })} />
          </label>
          <div className="customize-tip"><Sun size={14} /><span><strong>Tip</strong> Effects are off by default and can be disabled at any time. On devices that prefer reduced motion, animations are automatically suppressed.</span></div>
        </section>
      </div>

      <section className={`customize-final-preview customize-final-preview--${settings.backgroundStyle}`}>
        <div className="customize-final-preview__copy"><span className="eyebrow">CURRENT CONFIGURATION</span><h2>You're all set.</h2><p>{settings.accentColor.toUpperCase()} accent · {settings.effectMode.toUpperCase()} effects · {settings.backgroundStyle.toUpperCase()} background · {settings.theme.toUpperCase()} theme</p></div>
        <div className={`customize-final-preview__visual customize-final-preview__visual--${settings.effectMode}`}>
          <div className="customize-final-preview__orbit" /><div className="customize-final-preview__core" style={{ color: previewPalette.accent }}><Zap size={23} fill="currentColor" /></div>
        </div>
      </section>
    </div>
  );
}

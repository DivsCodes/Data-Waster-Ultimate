import { Monitor, Moon, Sun, Accessibility } from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { Link } from 'react-router-dom';
import { Palette, ArrowUpRight } from 'lucide-react';
import { useAppSettings } from '../app/providers/ThemeProvider';
import type { ThemeMode } from '../types/settings';

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'dark', label: 'Dark', icon: Moon, description: 'The default low-light workspace.' },
  { value: 'light', label: 'Light', icon: Sun, description: 'A bright interface for well-lit spaces.' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device appearance setting.' },
];

export function SettingsPage() {
  const { settings, setTheme, updateSettings } = useAppSettings();

  return (
    <div className="page-stack">
      <PageHeading eyebrow="PREFERENCES" title="Make it yours." description="Manage core preferences and accessibility. Visit the Visual Lab for deeper personalization." />
      <section className="settings-section">
        <div className="settings-section__heading">
          <div>
            <h2>Appearance</h2>
            <p>Choose how Data Waster looks on this device.</p>
          </div>
        </div>
        <div className="theme-options">
          {themeOptions.map(({ value, label, icon: Icon, description }) => (
            <button key={value} type="button" className={`theme-option${settings.theme === value ? ' theme-option--selected' : ''}`} onClick={() => setTheme(value)} aria-pressed={settings.theme === value}>
              <span className="theme-option__icon"><Icon size={18} /></span>
              <span className="theme-option__copy"><strong>{label}</strong><small>{description}</small></span>
              <span className="theme-option__radio" />
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section__heading">
          <div>
            <h2>Accessibility</h2>
            <p>Preferences that make the interface more comfortable to use.</p>
          </div>
          <Accessibility size={19} />
        </div>
        <label className="setting-row">
          <span><strong>Reduce motion</strong><small>Limit interface animations and transitions.</small></span>
          <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => updateSettings({ reducedMotion: event.target.checked })} />
        </label>
        <label className="setting-row">
          <span><strong>Compact navigation</strong><small>Use a narrower sidebar with icon-only navigation on larger screens.</small></span>
          <input type="checkbox" checked={settings.compactNavigation} onChange={(event) => updateSettings({ compactNavigation: event.target.checked })} />
        </label>
      </section>
      <section className="settings-section settings-customize-link">
        <div className="settings-section__heading">
          <div>
            <h2>Visual customization</h2>
            <p>Choose accent colors, visual effects, backgrounds and interface sounds.</p>
          </div>
          <Palette size={19} />
        </div>
        <Link className="button button--quiet" to="/customize">Open Visual Lab <ArrowUpRight size={14} /></Link>
      </section>
      <p className="settings-note">Preferences are stored locally in this browser. Sounds are synthesized on demand and are off by default.</p>
    </div>
  );
}

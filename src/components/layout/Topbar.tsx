import { Command, ExternalLink, Sun, Moon } from 'lucide-react';
import { useAppSettings } from '../../app/providers/ThemeProvider';

export function Topbar() {
  const { setTheme } = useAppSettings();
  const isLight = document.documentElement.dataset.theme === 'light';

  return (
    <header className="topbar">
      <div className="topbar__crumbs">
        <span className="topbar__crumb-muted">DATA WASTER</span>
        <span className="topbar__slash">/</span>
        <span>WORKSPACE</span>
      </div>
      <div className="topbar__actions">
        <span className="topbar__build"><span className="status-indicator" aria-hidden="true" /> PHASE 17 RC</span>
        <button
          className="icon-button"
          type="button"
          aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
          title="Toggle theme"
          onClick={() => setTheme(isLight ? 'dark' : 'light')}
        >
          {isLight ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <a className="topbar__reference" href="https://divscodes.github.io/DataWaster/" target="_blank" rel="noreferrer">
          <span>Original 3.0</span><ExternalLink size={13} />
        </a>
        <span className="topbar__shortcut"><Command size={12} /> DW4</span>
      </div>
    </header>
  );
}

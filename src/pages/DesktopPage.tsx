import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CircleHelp,
  Command,
  Download,
  FlaskConical,
  Folder,
  Gamepad2,
  HardDrive,
  Menu,
  Moon,
  Palette,
  Power,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../app/providers/ThemeProvider';
import { DesktopWindow } from '../components/desktop/DesktopWindow';
import {
  clampWindowRect,
  createDesktopWindow,
  focusDesktopWindow,
  readDesktopPreferences,
  toggleDesktopWindowMaximize,
  writeDesktopPreferences,
} from '../features/desktop-os/desktopState';
import type {
  DesktopAppId,
  DesktopBounds,
  DesktopPreferences,
  DesktopWindowState,
  WindowRect,
} from '../features/desktop-os/desktopState';
import { readGameProfile, getLevelProgress } from '../features/gamification/gamification';
import { readSessions } from '../features/sessions/sessionStorage';
import { formatBytes } from '../features/downloader/format';

interface DesktopAppDefinition {
  id: DesktopAppId;
  title: string;
  description: string;
  category: 'Workspace' | 'Insights' | 'System';
  icon: LucideIcon;
  route?: string;
}

interface DesktopNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: LucideIcon;
}

const desktopApps: DesktopAppDefinition[] = [
  { id: 'dashboard', title: 'Data Waster', description: 'Open the main transfer dashboard.', category: 'Workspace', icon: Zap, route: '/' },
  { id: 'laboratory', title: 'Network Lab', description: 'Inspect network diagnostics and benchmarks.', category: 'Workspace', icon: FlaskConical, route: '/laboratory' },
  { id: 'analytics', title: 'Analytics', description: 'Review your local sessions and records.', category: 'Insights', icon: BarChart3, route: '/analytics' },
  { id: 'arcade', title: 'Arcade', description: 'Play games and view your rewards.', category: 'Workspace', icon: Gamepad2, route: '/arcade' },
  { id: 'customize', title: 'Visual Lab', description: 'Personalize the look and feel.', category: 'System', icon: Palette, route: '/customize' },
  { id: 'settings', title: 'Settings', description: 'Manage appearance and accessibility.', category: 'System', icon: Settings2, route: '/settings' },
  { id: 'community', title: 'Community', description: 'Manage your local profile, teams and challenge drafts.', category: 'Workspace', icon: Users, route: '/community' },
  { id: 'tools', title: 'Tools & Dev Lab', description: 'Open calculators, API playground and browser diagnostics.', category: 'System', icon: Wrench, route: '/tools' },
  { id: 'explorer', title: 'Local Explorer', description: 'See what this browser stores locally.', category: 'System', icon: Folder },
  { id: 'help', title: 'Quick Help', description: 'Learn desktop controls and shortcuts.', category: 'System', icon: CircleHelp },
];

const initialNotifications: DesktopNotification[] = [
  {
    id: 'welcome',
    title: 'Welcome to Data Waster OS',
    body: 'Your desktop workspace is ready. Open an app from the desktop, launcher or dock.',
    time: 'Just now',
    read: false,
    icon: Sparkles,
  },
  {
    id: 'local-first',
    title: 'Your workspace stays local',
    body: 'Desktop preferences and game progress are stored in this browser. No account is required.',
    time: 'Workspace info',
    read: false,
    icon: ShieldCheck,
  },
  {
    id: 'tip',
    title: 'Quick tip',
    body: 'Drag a window by its title bar, resize it from the lower-right corner, or minimize it to the dock.',
    time: 'Tip',
    read: true,
    icon: Command,
  },
];

function currentBounds(stage: HTMLElement | null): DesktopBounds {
  return {
    width: Math.max(280, stage?.clientWidth ?? window.innerWidth),
    height: Math.max(220, stage?.clientHeight ?? window.innerHeight - 118),
  };
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function DesktopAppContent({
  app,
  sessionsTotal,
  sessionCount,
  level,
  gamesPlayed,
  online,
  preferences,
  onNavigate,
  onWallpaperChange,
  onThemeToggle,
  onReducedMotionChange,
}: {
  app: DesktopAppDefinition;
  sessionsTotal: number;
  sessionCount: number;
  level: number;
  gamesPlayed: number;
  online: boolean;
  preferences: DesktopPreferences;
  onNavigate: (route: string) => void;
  onWallpaperChange: (wallpaper: DesktopPreferences['wallpaper']) => void;
  onThemeToggle: () => void;
  onReducedMotionChange: (value: boolean) => void;
}) {
  const { settings } = useAppSettings();
  const navigateButton = (label: string, route?: string) => route ? (
    <button className="dw-app-action" type="button" onClick={() => onNavigate(route)}>{label}<ArrowUpRight size={13} /></button>
  ) : null;

  if (app.id === 'dashboard') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">WORKSPACE OVERVIEW</p>
        <h3>Your data, under control.</h3>
        <p className="dw-app-description">The main Data Waster dashboard is where real transfer sessions are configured and controlled.</p>
        <div className="dw-app-metrics">
          <div><span>SAVED DATA</span><strong>{formatBytes(sessionsTotal)}</strong></div>
          <div><span>SESSIONS</span><strong>{sessionCount}</strong></div>
          <div><span>CONNECTION</span><strong>{online ? 'Online' : 'Offline'}</strong></div>
        </div>
        {navigateButton('Open Data Waster dashboard', app.route)}
      </div>
    );
  }

  if (app.id === 'laboratory') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">NETWORK TOOLS</p>
        <h3>Connection status</h3>
        <p className="dw-app-description">Browser connectivity is a simple online/offline signal. Open the Network Lab for HTTP latency, DNS and other opt-in diagnostics.</p>
        <div className={`dw-connection-card${online ? ' dw-connection-card--online' : ' dw-connection-card--offline'}`}>
          {online ? <Wifi size={22} /> : <WifiOff size={22} />}
          <span><strong>{online ? 'Browser reports online' : 'Browser reports offline'}</strong><small>navigator.onLine · not a speed measurement</small></span>
        </div>
        {navigateButton('Open Network Lab', app.route)}
      </div>
    );
  }

  if (app.id === 'analytics') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">PERSONAL INSIGHTS</p>
        <h3>Your local activity</h3>
        <p className="dw-app-description">These figures come from saved download session summaries on this device.</p>
        <div className="dw-app-metrics">
          <div><span>SAVED DATA</span><strong>{formatBytes(sessionsTotal)}</strong></div>
          <div><span>SESSIONS</span><strong>{sessionCount}</strong></div>
          <div><span>SOURCE</span><strong>Local</strong></div>
        </div>
        {navigateButton('Open Analytics', app.route)}
      </div>
    );
  }

  if (app.id === 'arcade') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">GAME CENTER</p>
        <h3>Level {level} operator</h3>
        <p className="dw-app-description">Your progress is saved in this browser. Playing games is local and does not deliberately consume download data.</p>
        <div className="dw-app-metrics">
          <div><span>PLAYER LEVEL</span><strong>{level}</strong></div>
          <div><span>GAMES PLAYED</span><strong>{gamesPlayed}</strong></div>
          <div><span>SYNC</span><strong>Device</strong></div>
        </div>
        {navigateButton('Open Arcade', app.route)}
      </div>
    );
  }

  if (app.id === 'customize') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">DESKTOP APPEARANCE</p>
        <h3>Change your environment</h3>
        <p className="dw-app-description">Choose a desktop wallpaper here. For accent palettes, effects and sound options, open the full Visual Lab.</p>
        <div className="dw-wallpaper-options">
          {(['aurora', 'midnight', 'grid', 'sunset'] as const).map((wallpaper) => (
            <button key={wallpaper} type="button" className={preferences.wallpaper === wallpaper ? 'is-selected' : ''} onClick={() => onWallpaperChange(wallpaper)} aria-pressed={preferences.wallpaper === wallpaper}>{wallpaper}</button>
          ))}
        </div>
        {navigateButton('Open Visual Lab', app.route)}
      </div>
    );
  }

  if (app.id === 'settings') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">SYSTEM PREFERENCES</p>
        <h3>Control center</h3>
        <p className="dw-app-description">Quick changes apply across the Data Waster workspace and are saved on this device.</p>
        <div className="dw-control-row">
          <span><strong>Color theme</strong><small>Current: {settings.theme}</small></span>
          <button className="dw-small-button" type="button" onClick={onThemeToggle}>{settings.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />} Switch theme</button>
        </div>
        <label className="dw-control-row">
          <span><strong>Reduce motion</strong><small>Disable decorative animations.</small></span>
          <input type="checkbox" checked={settings.reducedMotion} onChange={(event) => onReducedMotionChange(event.target.checked)} />
        </label>
        <div className="dw-control-row">
          <span><strong>Desktop wallpaper</strong><small>Choose the workspace background.</small></span>
          <select value={preferences.wallpaper} onChange={(event) => onWallpaperChange(event.target.value as DesktopPreferences['wallpaper'])}>
            <option value="aurora">Aurora</option>
            <option value="midnight">Midnight</option>
            <option value="grid">Grid</option>
            <option value="sunset">Sunset</option>
          </select>
        </div>
        {navigateButton('Open full Settings', app.route)}
      </div>
    );
  }

  if (app.id === 'community') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">COMMUNITY WORKSPACE</p>
        <h3>Your community profile</h3>
        <p className="dw-app-description">Manage a local profile, saved contacts, team drafts and challenge ideas. Online social features are not connected in this static build.</p>
        <div className="dw-connection-card dw-connection-card--online">
          <Users size={22} />
          <span><strong>Local community preview</strong><small>Profile and drafts stay in this browser</small></span>
        </div>
        {navigateButton('Open Community', app.route)}
      </div>
    );
  }

  if (app.id === 'tools') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">ADVANCED TOOLS</p>
        <h3>Developer laboratory</h3>
        <p className="dw-app-description">Convert data units, plan local reminders, test CORS-enabled HTTPS APIs and inspect browser-exposed performance metrics.</p>
        <div className="dw-explorer-list">
          <div><Wrench size={15} /><span><strong>Utilities</strong><small>Data converter and bandwidth calculator</small></span></div>
          <div><Activity size={15} /><span><strong>Profiler</strong><small>Browser performance and resource diagnostics</small></span></div>
          <div><ShieldCheck size={15} /><span><strong>Local-first</strong><small>No telemetry or stored API credentials</small></span></div>
        </div>
        {navigateButton('Open Tools & Dev Lab', app.route)}
      </div>
    );
  }

  if (app.id === 'explorer') {
    return (
      <div className="dw-app-panel">
        <p className="dw-app-eyebrow">LOCAL EXPLORER</p>
        <h3>This browser's workspace</h3>
        <p className="dw-app-description">Data Waster keeps selected preferences, session summaries and arcade progress in local browser storage. This is not a view of your computer's files.</p>
        <div className="dw-explorer-list">
          <div><HardDrive size={15} /><span><strong>Download sessions</strong><small>{sessionCount} saved summaries · local storage</small></span></div>
          <div><Gamepad2 size={15} /><span><strong>Player profile</strong><small>Level {level} · {gamesPlayed} games played</small></span></div>
          <div><Settings2 size={15} /><span><strong>Preferences</strong><small>Theme, effects and desktop layout</small></span></div>
        </div>
        {navigateButton('Open Analytics', '/analytics')}
      </div>
    );
  }

  return (
    <div className="dw-app-panel">
      <p className="dw-app-eyebrow">QUICK HELP</p>
      <h3>Desktop controls</h3>
      <div className="dw-shortcut-list">
        <div><span>Open app launcher</span><kbd>Ctrl / ⌘ + K</kbd></div>
        <div><span>Close launcher or panel</span><kbd>Esc</kbd></div>
        <div><span>Move a window</span><kbd>Drag title bar</kbd></div>
        <div><span>Maximize / restore</span><kbd>Double-click title</kbd></div>
        <div><span>Resize a window</span><kbd>Drag lower-right</kbd></div>
      </div>
      <p className="dw-app-footnote">The desktop is a browser-based workspace, not a native operating system. It cannot manage your computer's files or system processes.</p>
    </div>
  );
}

export function DesktopPage() {
  const navigate = useNavigate();
  const { settings, setTheme, updateSettings } = useAppSettings();
  const stageRef = useRef<HTMLElement>(null);
  const launcherInputRef = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<DesktopPreferences>(readDesktopPreferences);
  const [windows, setWindows] = useState<DesktopWindowState[]>([]);
  const zIndexRef = useRef(10);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [launcherQuery, setLauncherQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [clock, setClock] = useState(() => new Date());
  const [online, setOnline] = useState(() => navigator.onLine);

  const sessions = useMemo(() => readSessions(), []);
  const sessionTotal = sessions.reduce((sum, item) => sum + item.transferredBytes, 0);
  const profile = useMemo(() => readGameProfile(), []);
  const levelProgress = getLevelProgress(profile.totalXp);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredApps = desktopApps.filter((app) => `${app.title} ${app.description} ${app.category}`.toLowerCase().includes(launcherQuery.toLowerCase()));
  const stageBounds = currentBounds(stageRef.current);

  useEffect(() => {
    writeDesktopPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (launcherOpen) launcherInputRef.current?.focus();
  }, [launcherOpen]);

  useEffect(() => {
    const handleViewportResize = () => {
      const bounds = currentBounds(stageRef.current);
      setWindows((existing) => existing.map((item) => item.maximized
        ? { ...item, x: 0, y: 0, width: bounds.width, height: bounds.height }
        : { ...item, ...clampWindowRect(item, bounds) }));
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setLauncherOpen((open) => !open);
        setNotificationsOpen(false);
        setControlCenterOpen(false);
      }
      if (event.key === 'Escape') {
        setLauncherOpen(false);
        setNotificationsOpen(false);
        setControlCenterOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const focusWindow = useCallback((id: DesktopAppId) => {
    const next = zIndexRef.current + 1;
    zIndexRef.current = next;
    setWindows((existing) => focusDesktopWindow(existing, id, next));
  }, []);

  const openApp = useCallback((id: DesktopAppId) => {
    setLauncherOpen(false);
    setLauncherQuery('');
    setNotificationsOpen(false);
    setControlCenterOpen(false);
    const nextZ = zIndexRef.current + 1;
    zIndexRef.current = nextZ;
    setWindows((existing) => {
      const found = existing.find((item) => item.id === id);
      if (found) return focusDesktopWindow(existing, id, nextZ);
      const newWindow = createDesktopWindow(id, existing.length, nextZ, currentBounds(stageRef.current));
      return [...existing, newWindow];
    });
  }, []);

  const updateWindowRect = useCallback((id: DesktopAppId, rect: WindowRect) => {
    setWindows((existing) => existing.map((item) => item.id === id ? { ...item, ...rect } : item));
  }, []);

  const closeWindow = (id: DesktopAppId) => setWindows((existing) => existing.filter((item) => item.id !== id));
  const minimizeWindow = (id: DesktopAppId) => setWindows((existing) => existing.map((item) => item.id === id ? { ...item, minimized: true } : item));
  const maximizeWindow = (id: DesktopAppId) => {
    const bounds = currentBounds(stageRef.current);
    setWindows((existing) => existing.map((item) => item.id === id ? toggleDesktopWindowMaximize(item, bounds) : item));
  };

  const openRoute = (route?: string) => {
    if (route) navigate(route);
  };

  const updateWallpaper = (wallpaper: DesktopPreferences['wallpaper']) => {
    setPreferences((current) => ({ ...current, wallpaper }));
  };

  const clearNotifications = () => setNotifications([]);
  const markAllRead = () => setNotifications((existing) => existing.map((item) => ({ ...item, read: true })));

  return (
    <div className={`dw-os dw-os--${preferences.wallpaper}`}>
      <header className="dw-system-bar">
        <div className="dw-system-brand">
          <span className="dw-system-logo"><Zap size={15} fill="currentColor" /></span>
          <strong>DATA WASTER <span>OS</span></strong>
        </div>
        <div className="dw-system-center"><span>WORKSPACE</span><i />{formatClock(clock)}<i />{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(clock)}</div>
        <div className="dw-system-actions">
          <span className={`dw-system-connectivity${online ? '' : ' is-offline'}`} title={online ? 'Browser reports online' : 'Browser reports offline'}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}</span>
          <button type="button" aria-label="Open quick settings" title="Quick settings" className={controlCenterOpen ? 'is-active' : ''} onClick={() => { setControlCenterOpen((open) => !open); setNotificationsOpen(false); setLauncherOpen(false); }}><SlidersHorizontal size={15} /></button>
          <button type="button" aria-label={`Notifications, ${unreadCount} unread`} title="Notifications" className={notificationsOpen ? 'is-active' : ''} onClick={() => { setNotificationsOpen((open) => !open); setControlCenterOpen(false); setLauncherOpen(false); }}><Bell size={15} />{unreadCount > 0 && <b>{unreadCount}</b>}</button>
          <button type="button" aria-label="Toggle color theme" title="Toggle theme" onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}>{settings.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</button>
        </div>
      </header>

      <main className="dw-desktop-stage" id="desktop-stage" ref={stageRef} tabIndex={-1} aria-label="Data Waster desktop workspace">
        {preferences.showDesktopIcons && (
          <div className="dw-desktop-icons" aria-label="Desktop applications">
            {desktopApps.map((app) => {
              const Icon = app.icon;
              return (
                <button key={app.id} className="dw-desktop-icon" type="button" onClick={() => openApp(app.id)}>
                  <span><Icon size={21} /></span>
                  <strong>{app.title}</strong>
                </button>
              );
            })}
          </div>
        )}

        {preferences.showWidgets && (
          <aside className="dw-desktop-widgets">
            <div className="dw-widget dw-widget--welcome">
              <span className="dw-widget-eyebrow">YOUR WORKSPACE</span>
              <strong>Make today count.</strong>
              <small>Everything in one place.</small>
              <div className="dw-widget-orb"><Zap size={20} fill="currentColor" /></div>
            </div>
            <div className="dw-widget dw-widget--stats">
              <div><span><Download size={12} /> SAVED DATA</span><strong>{formatBytes(sessionTotal)}</strong></div>
              <div><span><Activity size={12} /> SAVED SESSIONS</span><strong>{sessions.length}</strong></div>
              <div><span><Gamepad2 size={12} /> OPERATOR LEVEL</span><strong>{levelProgress.level}</strong></div>
            </div>
            <div className="dw-widget dw-widget--tip"><Sparkles size={13} /><span>Tip: press <kbd>Ctrl K</kbd> to find any app.</span></div>
          </aside>
        )}

        {windows.map((windowState) => {
          const app = desktopApps.find((candidate) => candidate.id === windowState.id);
          if (!app) return null;
          return (
            <DesktopWindow
              key={windowState.id}
              windowState={windowState}
              title={app.title}
              icon={app.icon}
              bounds={stageBounds}
              focused={windowState.zIndex === Math.max(...windows.filter((item) => !item.minimized).map((item) => item.zIndex), 0)}
              onFocus={focusWindow}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={maximizeWindow}
              onMove={updateWindowRect}
              onResize={updateWindowRect}
            >
              <DesktopAppContent
                app={app}
                sessionsTotal={sessionTotal}
                sessionCount={sessions.length}
                level={levelProgress.level}
                gamesPlayed={profile.gamesPlayed}
                online={online}
                preferences={preferences}
                onNavigate={openRoute}
                onWallpaperChange={updateWallpaper}
                onThemeToggle={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}
                onReducedMotionChange={(value) => updateSettings({ reducedMotion: value })}
              />
            </DesktopWindow>
          );
        })}

        {launcherOpen && (
          <div className="dw-launcher" role="dialog" aria-label="App launcher">
            <div className="dw-launcher__search"><Search size={16} /><input ref={launcherInputRef} type="search" value={launcherQuery} onChange={(event) => setLauncherQuery(event.target.value)} placeholder="Search apps and tools…" aria-label="Search apps" /><kbd>ESC</kbd><button type="button" aria-label="Close launcher" onClick={() => setLauncherOpen(false)}><X size={14} /></button></div>
            <div className="dw-launcher__section-label">APPLICATIONS</div>
            {filteredApps.length > 0 ? (
              <div className="dw-launcher__grid">
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  return <button key={app.id} type="button" onClick={() => openApp(app.id)}><span><Icon size={19} /></span><strong>{app.title}</strong><small>{app.category}</small></button>;
                })}
              </div>
            ) : <div className="dw-launcher__empty">No apps match “{launcherQuery}”.</div>}
            <div className="dw-launcher__footer"><span>DATA WASTER OS</span><span>10 APPS AVAILABLE</span></div>
          </div>
        )}

        {notificationsOpen && (
          <aside className="dw-notification-center" aria-label="Notification center">
            <div className="dw-panel-heading"><div><span className="dw-panel-eyebrow">SYSTEM CENTER</span><h2>Notifications</h2></div><button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={15} /></button></div>
            <div className="dw-notification-actions"><button type="button" onClick={markAllRead}><Check size={12} /> Mark all read</button><button type="button" onClick={clearNotifications}>Clear all</button></div>
            {notifications.length ? notifications.map((notification) => {
              const Icon = notification.icon;
              return <article className={`dw-notification${notification.read ? '' : ' is-unread'}`} key={notification.id}><span className="dw-notification__icon"><Icon size={15} /></span><div><div className="dw-notification__title"><strong>{notification.title}</strong><small>{notification.time}</small></div><p>{notification.body}</p><button type="button" onClick={() => setNotifications((existing) => existing.map((item) => item.id === notification.id ? { ...item, read: true } : item))}>{notification.read ? 'Read' : 'Mark as read'}</button></div></article>;
            }) : <div className="dw-panel-empty"><Bell size={22} /><strong>You're all caught up.</strong><span>No notifications right now.</span></div>}
            <div className="dw-panel-footnote">Notifications shown here are local to this browser session.</div>
          </aside>
        )}

        {controlCenterOpen && (
          <aside className="dw-control-center" aria-label="Quick settings">
            <div className="dw-panel-heading"><div><span className="dw-panel-eyebrow">SYSTEM CONTROLS</span><h2>Quick settings</h2></div><button type="button" aria-label="Close quick settings" onClick={() => setControlCenterOpen(false)}><X size={15} /></button></div>
            <div className="dw-quick-grid">
              <button type="button" onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}>
                <span>{settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</span>
                <strong>{settings.theme === 'light' ? 'Dark theme' : 'Light theme'}</strong>
              </button>
              <button type="button" onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}>
                <span><Activity size={18} /></span>
                <strong>{settings.reducedMotion ? 'Motion reduced' : 'Full motion'}</strong>
              </button>
            </div>
            <label className="dw-wallpaper-control">
              <span><strong>Desktop wallpaper</strong><small>Personalize the workspace background.</small></span>
              <select value={preferences.wallpaper} onChange={(event) => updateWallpaper(event.target.value as DesktopPreferences['wallpaper'])}>
                <option value="aurora">Aurora</option><option value="midnight">Midnight</option><option value="grid">Grid</option><option value="sunset">Sunset</option>
              </select>
            </label>
            <label className="dw-setting-toggle">
              <span><strong>Desktop widgets</strong><small>Show activity and level cards.</small></span>
              <input type="checkbox" checked={preferences.showWidgets} onChange={(event) => setPreferences((current) => ({ ...current, showWidgets: event.target.checked }))} />
            </label>
            <label className="dw-setting-toggle">
              <span><strong>Desktop icons</strong><small>Show app shortcuts on the desktop.</small></span>
              <input type="checkbox" checked={preferences.showDesktopIcons} onChange={(event) => setPreferences((current) => ({ ...current, showDesktopIcons: event.target.checked }))} />
            </label>
            <div className="dw-panel-footnote">Changes are saved locally in this browser.</div>
          </aside>
        )}
      </main>

      <footer className="dw-dock" aria-label="Application dock">
        <button className="dw-dock__launcher" type="button" aria-label="Open app launcher" title="App launcher" onClick={() => { setLauncherOpen((open) => !open); setNotificationsOpen(false); setControlCenterOpen(false); }}><Menu size={19} /></button>
        <span className="dw-dock__divider" />
        {desktopApps.slice(0, 8).map((app) => {
          const Icon = app.icon;
          const isOpen = windows.some((item) => item.id === app.id);
          const isVisible = windows.some((item) => item.id === app.id && !item.minimized);
          return (
            <button key={app.id} className={`dw-dock__app${isOpen ? ' is-open' : ''}${isVisible ? ' is-visible' : ''}`} type="button" title={app.title} aria-label={`Open ${app.title}`} onClick={() => openApp(app.id)}>
              <Icon size={18} /><i />
            </button>
          );
        })}
        <span className="dw-dock__spacer" />
        <div className="dw-dock__system">
          <span className="dw-dock__online"><i />{online ? 'ONLINE' : 'OFFLINE'}</span>
          <span>{formatClock(clock)}</span>
          <button type="button" title="Back to Data Waster dashboard" aria-label="Exit desktop workspace" onClick={() => navigate('/')}><Power size={15} /></button>
        </div>
      </footer>
    </div>
  );
}

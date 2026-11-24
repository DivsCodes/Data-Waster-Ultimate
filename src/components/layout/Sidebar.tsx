import {
  Activity,
  BookOpen,
  CircleHelp,
  BarChart3,
  FlaskConical,
  Gamepad2,
  LayoutDashboard,
  Monitor,
  Palette,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/laboratory', label: 'Laboratory', icon: FlaskConical },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/arcade', label: 'Arcade', icon: Gamepad2 },
  { to: '/customize', label: 'Customize', icon: Palette },
  { to: '/desktop', label: 'Desktop OS', icon: Monitor },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/tools', label: 'Tools & Dev Lab', icon: Wrench },
];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <NavLink to="/" className="brand-lockup" aria-label="Data Waster home">
        <span className="brand-mark"><Zap size={19} fill="currentColor" /></span>
        <span className="brand-copy">
          <strong>DATA WASTER</strong>
          <small>VERSION 4.0 · RC.19</small>
        </span>
      </NavLink>

      <div className="sidebar__section-label">WORKSPACE</div>
      <nav className="sidebar__nav" aria-label="Workspace navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
            <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
            {label === 'Dashboard' && <span className="nav-link__dot" />}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__section-label sidebar__section-label--resources">RESOURCES</div>
      <nav className="sidebar__nav sidebar__nav--resources" aria-label="Project resources">
        <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}><BookOpen size={17} aria-hidden="true" /><span>About</span></NavLink>
        <NavLink to="/help" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}><CircleHelp size={17} aria-hidden="true" /><span>Help Center</span></NavLink>
        <NavLink to="/privacy" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}><ShieldCheck size={17} aria-hidden="true" /><span>Privacy</span></NavLink>
      </nav>
      <div className="sidebar__spacer" />
      <div className="sidebar__status">
        <span className="status-indicator" aria-hidden="true" />
        <div>
          <strong>Workspace online</strong>
          <small>Phase 17 release QA</small>
        </div>
      </div>
      <NavLink to="/settings" className={({ isActive }) => `nav-link nav-link--settings${isActive ? ' nav-link--active' : ''}`}>
        <Settings2 size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>Settings</span>
      </NavLink>
      <div className="sidebar__version"><Activity size={13} /> Built for the curious</div>
    </aside>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const location = useLocation();
  const isDesktop = location.pathname === '/desktop';

  if (isDesktop) {
    return (
      <div className="app-frame app-frame--desktop">
        <a className="skip-link" href="#desktop-stage">Skip to desktop workspace</a>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
          <footer className="app-footer">
            <span>DATA WASTER 4.0 <span className="footer-separator">/</span> PHASE 17 · RELEASE QA</span>
            <span>Use your data wisely. Or don't.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

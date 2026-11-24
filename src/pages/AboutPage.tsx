import { ArrowUpRight, Download, FlaskConical, Gamepad2, Monitor, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/ui/PageHeading';

const areas = [
  { icon: Download, title: 'Data transfer', detail: 'A user-controlled streaming downloader with target limits, pause and stop controls.' },
  { icon: FlaskConical, title: 'Network laboratory', detail: 'Browser-based diagnostics, HTTP timing, DNS lookup and transfer benchmarks.' },
  { icon: Sparkles, title: 'Analytics & customization', detail: 'Local session reports, personal records, themes and optional visual effects.' },
  { icon: Gamepad2, title: 'Arcade & rewards', detail: 'Small offline-friendly games, local XP, missions and achievements.' },
  { icon: Monitor, title: 'Data Waster OS', detail: 'A desktop-inspired workspace that runs inside the browser.' },
  { icon: Wrench, title: 'Developer tools', detail: 'Utilities, a guarded API playground and browser diagnostics.' },
];

export function AboutPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="ABOUT THE PROJECT" title="A playground for your connection." description="Data Waster 4.0 is a browser-based internet utility and experimentation dashboard, built around user-controlled transfers, diagnostics, analytics and playful interfaces." />
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>What this project is</h2><p>One workspace with practical tools and a little bit of fun.</p></div><Sparkles size={19} /></div>
        <p className="info-page-copy">The project began as an evolution of Data Waster 3.0. Version 4.0 expands the original idea into a modular web application. It runs in your browser; it is not a native operating system, a network proxy, or a background service.</p>
        <div className="info-feature-grid">
          {areas.map(({ icon: Icon, title, detail }) => <article className="info-feature" key={title}><span><Icon size={17} /></span><div><strong>{title}</strong><p>{detail}</p></div></article>)}
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Project principles</h2><p>Clear controls and honest capability boundaries.</p></div><ShieldCheck size={19} /></div>
        <ul className="info-list">
          <li>Transfers are user-initiated and have a configurable target plus a hard per-session cap.</li>
          <li>Local features are labelled as local; community drafts are not presented as live multiplayer.</li>
          <li>Network diagnostics explain browser and cross-origin limitations.</li>
          <li>Settings and history stay in this browser unless you explicitly export them.</li>
        </ul>
      </section>
      <div className="info-link-row"><Link className="button button--quiet" to="/help">Read the user guide <ArrowUpRight size={14} /></Link><Link className="button button--quiet" to="/privacy">Privacy details <ArrowUpRight size={14} /></Link></div>
      <p className="settings-note">Data Waster 4.0 · Release candidate · Built as a static-hosting-friendly web application.</p>
    </div>
  );
}

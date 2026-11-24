import { ArrowDownToLine, ExternalLink, Gauge, LifeBuoy, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/ui/PageHeading';

const guides = [
  { title: 'Start a transfer', body: 'Open Dashboard, choose a target, review the confirmation, then start. Pause, resume or stop from the same controls. Keep the tab open for the most reliable results; browsers may throttle background tabs.' },
  { title: 'Understand the numbers', body: 'The app counts bytes delivered in readable response-body chunks. This is not identical to your carrier or ISP meter, which may include protocol overhead, retries or other device traffic.' },
  { title: 'Use network diagnostics', body: 'HTTP response time is not ICMP ping. DNS and public-IP lookups contact their named third-party services only when you run them. Browser support and CORS policies affect the results.' },
  { title: 'Find your saved data', body: 'Session history, settings, game progress, desktop preferences, reminders and community drafts are stored in this browser. Use the available CSV/JSON exports before clearing browser data or changing devices.' },
  { title: 'Troubleshoot a failed request', body: 'Check your connection, confirm the GitHub Pages payload file is present, and inspect the browser console. The API Playground is separate: cross-origin requests require the target server to allow your site through CORS.' },
];

export function HelpPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="HELP CENTER" title="Quick answers, no guesswork." description="Guidance for transfers, diagnostics, saved data and common browser limitations." />
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Getting started</h2><p>Follow these guides before running a large transfer.</p></div><LifeBuoy size={19} /></div>
        <div className="info-guide-list">{guides.map((guide, index) => <article className="info-guide" key={guide.title}><span className="info-guide__number">{String(index + 1).padStart(2, '0')}</span><div><h3>{guide.title}</h3><p>{guide.body}</p></div></article>)}</div>
      </section>
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Important limits</h2><p>Know what a browser app can and cannot do.</p></div><ShieldAlert size={19} /></div>
        <ul className="info-list">
          <li>Downloads depend on the static payload file being available from your GitHub Pages site and the host honoring HTTP byte-range requests.</li>
          <li>Closing or suspending the browser can interrupt transfers, reminders and monitoring.</li>
          <li>Global accounts, synchronized friends and real multiplayer require a separately deployed backend; the current Community area is local-first.</li>
          <li>Browser diagnostics are estimates and do not replace operating-system or ISP tools.</li>
        </ul>
      </section>
      <div className="info-link-row"><Link className="button button--primary" to="/">Open dashboard <ArrowDownToLine size={14} /></Link><a className="button button--quiet" href="https://divscodes.github.io/DataWaster/" target="_blank" rel="noreferrer">Original Data Waster 3.0 <ExternalLink size={13} /></a></div>
      <div className="info-callout"><Gauge size={17} /><p><strong>Tip:</strong> Try a small transfer first to confirm the GitHub Pages payload is responding before choosing a larger target.</p></div>
    </div>
  );
}

import { Database, Globe2, ShieldCheck } from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';

export function PrivacyPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="PRIVACY & DATA" title="Your browser, your data." description="A plain-language overview of what Data Waster 4.0 stores locally and what network requests it makes." />
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Stored on this device</h2><p>Local browser storage is used for convenience.</p></div><Database size={19} /></div>
        <ul className="info-list">
          <li>Appearance preferences, desktop settings and accessibility choices.</li>
          <li>Download session summaries, analytics inputs and game progress.</li>
          <li>Community profile drafts, contacts, team/challenge drafts and scheduler reminders.</li>
          <li>These records are not automatically synchronized to a server and are not encrypted as a secure vault.</li>
        </ul>
      </section>
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Network requests</h2><p>External services receive requests only when a feature calls them.</p></div><Globe2 size={19} /></div>
        <ul className="info-list">
          <li>The GitHub Pages site serves the static download payload when you start a transfer or run the throughput benchmark.</li>
          <li>Network tools may contact the selected test target, ipify for public IP lookup, or Google Public DNS for DNS-over-HTTPS lookup.</li>
          <li>The API Playground sends the URL, method, headers and body you enter when you press Send. It does not save those request fields.</li>
          <li>External providers apply their own privacy policies, logs, availability and CORS rules.</li>
        </ul>
      </section>
      <section className="settings-section">
        <div className="settings-section__heading"><div><h2>Your choices</h2><p>Export what you need before clearing browser storage.</p></div><ShieldCheck size={19} /></div>
        <ul className="info-list">
          <li>Use Analytics exports to save session records in CSV or JSON where available.</li>
          <li>Use Community export to save your local profile data.</li>
          <li>Clearing site data in your browser removes locally stored records and preferences.</li>
          <li>Do not store passwords, payment details, API secrets or sensitive personal information in this application.</li>
        </ul>
      </section>
      <p className="settings-note">This page describes the current client-side application behavior; it is not legal advice. The application and its download payload are hosted together on GitHub Pages.</p>
    </div>
  );
}

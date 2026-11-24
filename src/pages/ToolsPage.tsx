import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  Braces,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Layers3,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Terminal,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import {
  createReminder,
  dismissReminder,
  executeApiPlaygroundRequest,
  formatBytesCompact,
  formatDuration,
  getPerformanceSnapshot,
  markDueReminders,
  readReminders,
  writeReminders,
  convertDataAmount,
  estimateTransferSeconds,
  validateApiPlaygroundInput,
} from '../features/tools/tools';
import type {
  ApiMethod,
  ApiPlaygroundResult,
  DataUnit,
  DownloadReminder,
  PerformanceSnapshot,
} from '../features/tools/tools';

 type ToolsTab = 'utilities' | 'scheduler' | 'api' | 'diagnostics' | 'components';

const tabs: { id: ToolsTab; label: string; icon: typeof Wrench; description: string }[] = [
  { id: 'utilities', label: 'Utilities', icon: Gauge, description: 'Convert data sizes and estimate transfer time.' },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock, description: 'Create local reminders for future download sessions.' },
  { id: 'api', label: 'API playground', icon: Braces, description: 'Send a deliberate browser-side request to an HTTPS endpoint.' },
  { id: 'diagnostics', label: 'Profiler & debug', icon: Activity, description: 'Inspect this page’s browser-exposed performance information.' },
  { id: 'components', label: 'Component lab', icon: Layers3, description: 'Preview the reusable interface building blocks.' },
];

const units: DataUnit[] = ['B', 'KB', 'MB', 'GB', 'TB'];
const methods: ApiMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function saveJsonFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatMetric(value: number | null, suffix = ''): string {
  return value === null || !Number.isFinite(value) ? 'Not exposed' : `${value.toFixed(value >= 100 ? 0 : 1)}${suffix}`;
}

export function ToolsPage() {
  const [tab, setTab] = useState<ToolsTab>('utilities');
  const [notice, setNotice] = useState('');
  const [fromValue, setFromValue] = useState('1024');
  const [fromUnit, setFromUnit] = useState<DataUnit>('MB');
  const [toUnit, setToUnit] = useState<DataUnit>('GB');
  const [estimateAmount, setEstimateAmount] = useState('1');
  const [estimateUnit, setEstimateUnit] = useState<DataUnit>('GB');
  const [estimateSpeed, setEstimateSpeed] = useState('100');

  const [reminders, setReminders] = useState<DownloadReminder[]>(readReminders);
  const [reminderTitle, setReminderTitle] = useState('My next data session');
  const [reminderTarget, setReminderTarget] = useState('1024');
  const [reminderDate, setReminderDate] = useState(() => formatLocalDateTime(new Date(Date.now() + 10 * 60_000)));

  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [apiMethod, setApiMethod] = useState<ApiMethod>('GET');
  const [apiHeaders, setApiHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [apiBody, setApiBody] = useState('');
  const [apiBusy, setApiBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiResult, setApiResult] = useState<ApiPlaygroundResult | null>(null);

  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(() => getPerformanceSnapshot());
  const [debugOpen, setDebugOpen] = useState(false);
  const [showComponentNote, setShowComponentNote] = useState(false);

  const convertedValue = useMemo(() => {
    const value = Number(fromValue);
    if (!Number.isFinite(value) || value < 0 || fromValue.trim() === '') return null;
    return convertDataAmount(value, fromUnit, toUnit);
  }, [fromValue, fromUnit, toUnit]);

  const estimatedSeconds = useMemo(() => estimateTransferSeconds(
    Number(estimateAmount), estimateUnit, Number(estimateSpeed),
  ), [estimateAmount, estimateUnit, estimateSpeed]);

  useEffect(() => {
    const refresh = () => setSnapshot(getPerformanceSnapshot());
    const id = window.setInterval(refresh, 2_000);
    window.addEventListener('resize', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = readReminders();
      const update = markDueReminders(current);
      if (update.newlyDue.length === 0) return;
      writeReminders(update.items);
      setReminders(update.items);
      setNotice(`${update.newlyDue.length} download reminder${update.newlyDue.length === 1 ? '' : 's'} due. Data Waster did not start a download.`);
      if ('Notification' in window && Notification.permission === 'granted') {
        update.newlyDue.forEach((item) => {
          try { new Notification('Data Waster reminder', { body: `${item.title} · ${item.targetMB.toLocaleString()} MB target` }); } catch { /* Browser may suppress notifications. */ }
        });
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  const addScheduledReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = createReminder({
      title: reminderTitle,
      targetMB: Number(reminderTarget),
      scheduledAt: new Date(reminderDate).getTime(),
    });
    if (!created) {
      setNotice('Check the reminder title, target (1–10,240 MB) and future time (at least one minute from now).');
      return;
    }
    const next = [created, ...reminders].slice(0, 30);
    if (!writeReminders(next)) {
      setNotice('Could not save the reminder in this browser. Check local storage permissions.');
      return;
    }
    setReminders(next);
    setNotice('Reminder saved on this device. It only checks while this page is open.');
  };

  const dismissScheduledReminder = (id: string) => {
    const next = dismissReminder(reminders, id);
    writeReminders(next);
    setReminders(next);
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotice('This browser does not support desktop notifications. In-page reminders still work while the page is open.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotice(permission === 'granted' ? 'Desktop reminders enabled.' : 'Notification permission was not granted. In-page reminders remain available.');
    } catch {
      setNotice('Could not request notification permission in this browser context.');
    }
  };

  const sendApiRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError('');
    setApiResult(null);
    try {
      validateApiPlaygroundInput({ url: apiUrl, method: apiMethod, headersText: apiHeaders, body: apiBody });
      setApiBusy(true);
      const result = await executeApiPlaygroundRequest({ url: apiUrl, method: apiMethod, headersText: apiHeaders, body: apiBody });
      setApiResult(result);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'The request could not be completed.');
    } finally {
      setApiBusy(false);
    }
  };

  const exportDiagnostics = () => {
    const payload = { product: 'Data Waster 4.0', phase: 10, exportedAt: new Date().toISOString(), snapshot };
    saveJsonFile('data-waster-diagnostics.json', JSON.stringify(payload, null, 2));
    setNotice('Diagnostics snapshot exported.');
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setNotice('Diagnostics copied to clipboard.');
    } catch {
      setNotice('Clipboard access is unavailable. Use Export JSON instead.');
    }
  };

  return (
    <div className="page-stack tools-page">
      <PageHeading
        eyebrow="ADVANCED WORKSPACE"
        title="Tools & developer lab."
        description="Practical data utilities, local reminders, a guarded API playground and browser diagnostics. Tools run in this tab and respect browser permissions."
        action={<span className="status-pill status-pill--success"><Wrench size={13} /> PHASE 10</span>}
      />

      <div className="tools-tabs" role="tablist" aria-label="Developer tools">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tools-tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15} /><span>{label}</span>
          </button>
        ))}
      </div>

      {notice && <div className="tools-notice" role="status"><Check size={15} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={14} /></button></div>}

      {tab === 'utilities' && (
        <>
          <div className="tools-section-intro"><div><p className="eyebrow">DATA UTILITIES</p><h2>Quick calculations</h2><p>Conversions use binary units (1 KB = 1,024 bytes). Bandwidth estimates use decimal Mbps.</p></div><Gauge size={22} /></div>
          <div className="tools-grid tools-grid--two">
            <section className="tools-card">
              <div className="tools-card__heading"><span className="tools-card__icon"><Database size={17} /></span><div><h3>Data unit converter</h3><p>Convert between B, KB, MB, GB and TB.</p></div></div>
              <div className="tools-form-row">
                <label className="tools-field tools-field--grow"><span>Amount</span><input type="number" min="0" step="any" value={fromValue} onChange={(event) => setFromValue(event.target.value)} /></label>
                <label className="tools-field"><span>From</span><select value={fromUnit} onChange={(event) => setFromUnit(event.target.value as DataUnit)}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              </div>
              <div className="tools-convert-arrow"><ChevronRight size={17} /></div>
              <div className="tools-form-row">
                <div className="tools-result-box"><span>Converted amount</span><strong>{convertedValue === null ? '—' : convertedValue.toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong></div>
                <label className="tools-field"><span>To</span><select value={toUnit} onChange={(event) => setToUnit(event.target.value as DataUnit)}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              </div>
              <p className="tools-footnote">Values are calculated locally and are not uploaded.</p>
            </section>

            <section className="tools-card">
              <div className="tools-card__heading"><span className="tools-card__icon"><Clock3 size={17} /></span><div><h3>Bandwidth calculator</h3><p>Estimate how long a transfer may take at a steady rate.</p></div></div>
              <div className="tools-form-row">
                <label className="tools-field tools-field--grow"><span>Target amount</span><input type="number" min="0" step="any" value={estimateAmount} onChange={(event) => setEstimateAmount(event.target.value)} /></label>
                <label className="tools-field"><span>Unit</span><select value={estimateUnit} onChange={(event) => setEstimateUnit(event.target.value as DataUnit)}>{units.filter((unit) => unit !== 'B').map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              </div>
              <label className="tools-field tools-field--full"><span>Estimated download speed (Mbps)</span><input type="number" min="0.01" step="any" value={estimateSpeed} onChange={(event) => setEstimateSpeed(event.target.value)} /></label>
              <div className="tools-result-box tools-result-box--wide"><span>Estimated transfer time</span><strong>{estimatedSeconds === null ? 'Enter a positive amount and speed' : formatDuration(estimatedSeconds)}</strong></div>
              <p className="tools-footnote">Real-world throughput varies with Wi-Fi, congestion, server speed and protocol overhead.</p>
            </section>
          </div>
          <section className="tools-info-strip"><ShieldCheck size={17} /><p><strong>Safe by design.</strong> These calculators are offline utilities. They do not start downloads or change your network settings.</p></section>
        </>
      )}

      {tab === 'scheduler' && (
        <>
          <div className="tools-section-intro"><div><p className="eyebrow">LOCAL SCHEDULER</p><h2>Plan a future session.</h2><p>Create a reminder for a time when you want to return to Data Waster.</p></div><CalendarClock size={22} /></div>
          <div className="tools-grid tools-grid--scheduler">
            <section className="tools-card">
              <div className="tools-card__heading"><span className="tools-card__icon"><Plus size={17} /></span><div><h3>New reminder</h3><p>Reminders are stored in this browser.</p></div></div>
              <form className="tools-form" onSubmit={addScheduledReminder}>
                <label className="tools-field tools-field--full"><span>Reminder name</span><input required maxLength={80} value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} /></label>
                <label className="tools-field tools-field--full"><span>Planned target (MB)</span><input required type="number" min="1" max="10240" step="1" value={reminderTarget} onChange={(event) => setReminderTarget(event.target.value)} /></label>
                <label className="tools-field tools-field--full"><span>Date and time (your local time)</span><input required type="datetime-local" min={formatLocalDateTime(new Date(Date.now() + 60_000))} value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} /></label>
                <button className="button button--primary" type="submit"><Plus size={14} /> Save reminder</button>
              </form>
              <button className="button button--quiet" type="button" onClick={() => void requestNotifications()}>Enable browser notifications</button>
            </section>
            <section className="tools-card">
              <div className="tools-card__heading"><span className="tools-card__icon"><CalendarClock size={17} /></span><div><h3>Your reminders</h3><p>{reminders.filter((item) => item.status !== 'dismissed').length} active · {reminders.length} total saved</p></div></div>
              {reminders.length === 0 ? <div className="tools-empty"><CalendarClock size={24} /><strong>No reminders yet</strong><span>Add a planned session to see it here.</span></div> : (
                <div className="tools-reminder-list">
                  {reminders.map((item) => (
                    <article className={`tools-reminder${item.status === 'due' ? ' is-due' : ''}${item.status === 'dismissed' ? ' is-dismissed' : ''}`} key={item.id}>
                      <div><strong>{item.title}</strong><span>{item.targetMB.toLocaleString()} MB · {new Date(item.scheduledAt).toLocaleString()}</span></div>
                      <div className="tools-reminder__actions"><span className={`tools-state tools-state--${item.status}`}>{item.status === 'due' ? 'Due now' : item.status}</span>{item.status !== 'dismissed' && <button type="button" className="tools-icon-button" onClick={() => dismissScheduledReminder(item.id)} aria-label={`Dismiss ${item.title}`}><Trash2 size={14} /></button>}</div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="tools-info-strip tools-info-strip--warning"><AlertCircle size={17} /><p><strong>Browser limitation:</strong> this is a reminder scheduler, not a background download scheduler. It checks while this page is open; browsers may suspend background tabs, and it never starts a download automatically.</p></section>
        </>
      )}

      {tab === 'api' && (
        <>
          <div className="tools-section-intro"><div><p className="eyebrow">HTTP WORKBENCH</p><h2>API playground.</h2><p>Make an explicit test request from your browser and inspect the response.</p></div><Code2 size={22} /></div>
          <section className="tools-card tools-api-card">
            <div className="tools-api-safety"><ShieldCheck size={17} /><p><strong>Browser-side only.</strong> Requests require CORS permission from the target server. Only HTTPS is allowed (HTTP localhost is permitted). Ambient cookies are omitted; any Authorization header you explicitly enter is sent only to your chosen URL and is not saved. Requests are never proxied, and playground inputs are not persisted.</p></div>
            <form className="tools-form" onSubmit={sendApiRequest}>
              <div className="tools-api-url-row">
                <label className="tools-field tools-field--method"><span>Method</span><select value={apiMethod} onChange={(event) => { const method = event.target.value as ApiMethod; setApiMethod(method); if (method === 'GET' || method === 'HEAD') setApiBody(''); }}>{methods.map((method) => <option key={method}>{method}</option>)}</select></label>
                <label className="tools-field tools-field--grow"><span>Request URL</span><input required type="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://api.example.com/endpoint" /></label>
              </div>
              <label className="tools-field tools-field--full"><span>Headers (JSON object)</span><textarea rows={4} spellCheck={false} value={apiHeaders} onChange={(event) => setApiHeaders(event.target.value)} /></label>
              <label className="tools-field tools-field--full"><span>Request body (up to 32 KiB; leave empty for GET/HEAD)</span><textarea rows={5} spellCheck={false} value={apiBody} onChange={(event) => setApiBody(event.target.value)} placeholder={'{\n  "example": true\n}'} /></label>
              <button className="button button--primary" type="submit" disabled={apiBusy}>{apiBusy ? <RefreshCw size={14} className="tools-spin" /> : <Send size={14} />}{apiBusy ? ' Sending request…' : ' Send request'}</button>
            </form>
            {apiError && <div className="tools-api-error" role="alert"><AlertCircle size={15} />{apiError}</div>}
            {apiResult && (
              <div className="tools-api-response">
                <div className="tools-api-response__heading"><div><span className={`tools-state ${apiResult.ok ? 'tools-state--due' : 'tools-state--dismissed'}`}>{apiResult.status} {apiResult.statusText || (apiResult.ok ? 'OK' : 'Error')}</span><span>{apiResult.durationMs.toFixed(0)} ms</span></div><button type="button" className="button button--quiet" onClick={() => setApiResult(null)}><X size={13} /> Clear response</button></div>
                <h4>Response body {apiResult.truncated && '(truncated)'}</h4>
                <pre>{apiResult.body || '(empty response)'}</pre>
                <details><summary>Response headers</summary><pre>{JSON.stringify(apiResult.responseHeaders, null, 2)}</pre></details>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'diagnostics' && (
        <>
          <div className="tools-section-intro"><div><p className="eyebrow">BROWSER DIAGNOSTICS</p><h2>Performance profiler.</h2><p>Live measurements exposed by this browser. Unsupported metrics are shown as “Not exposed”.</p></div><Activity size={22} /></div>
          <div className="tools-diagnostic-toolbar"><span><i className={snapshot.online ? 'is-online' : 'is-offline'} /> {snapshot.online ? 'Browser online' : 'Browser offline'} · refreshed every 2 seconds</span><div><button className="button button--quiet" type="button" onClick={() => setDebugOpen((current) => !current)}><Terminal size={13} /> {debugOpen ? 'Hide' : 'Show'} debug overlay</button><button className="button button--quiet" type="button" onClick={() => void copyDiagnostics()}><Copy size={13} /> Copy JSON</button><button className="button button--primary" type="button" onClick={exportDiagnostics}><ArrowDownToLine size={13} /> Export</button></div></div>
          <div className="tools-metric-grid">
            <DiagnosticMetric icon={<Cpu size={16} />} label="Logical CPU cores" value={snapshot.cores === null ? 'Not exposed' : String(snapshot.cores)} detail="navigator.hardwareConcurrency" />
            <DiagnosticMetric icon={<HardDrive size={16} />} label="Device memory" value={snapshot.deviceMemoryGB === null ? 'Not exposed' : `${snapshot.deviceMemoryGB} GB`} detail="Approximate browser hint" />
            <DiagnosticMetric icon={<Gauge size={16} />} label="Connection type" value={snapshot.connectionType} detail={`${formatMetric(snapshot.connectionDownlinkMbps, ' Mbps')} · ${formatMetric(snapshot.connectionRttMs, ' ms RTT')}`} />
            <DiagnosticMetric icon={<Activity size={16} />} label="Navigation load" value={formatMetric(snapshot.navigationLoadMs, ' ms')} detail="Performance Navigation Timing" />
            <DiagnosticMetric icon={<Database size={16} />} label="JS heap used" value={snapshot.jsHeapUsedMB === null ? 'Not exposed' : `${snapshot.jsHeapUsedMB.toFixed(1)} MB`} detail={snapshot.jsHeapLimitMB === null ? 'Browser-specific memory API' : `Heap limit ${snapshot.jsHeapLimitMB.toFixed(1)} MB`} />
            <DiagnosticMetric icon={<Layers3 size={16} />} label="Resource entries" value={String(snapshot.resourceCount)} detail="Resources visible to Performance API" />
            <DiagnosticMetric icon={<ArrowDownToLine size={16} />} label="Resource transfer" value={formatBytesCompact(snapshot.resourceTransferBytes)} detail="May omit cross-origin transfer sizes" />
            <DiagnosticMetric icon={<HardDrive size={16} />} label="Local storage estimate" value={formatBytesCompact(snapshot.localStorageApproxBytes)} detail="Approximate UTF-16 key/value size" />
          </div>
          <section className="tools-card tools-debug-card">
            <div className="tools-card__heading"><span className="tools-card__icon"><Terminal size={17} /></span><div><h3>Debug overlay</h3><p>Quick status panel for layout and browser diagnostics.</p></div></div>
            {debugOpen ? <div className="tools-debug-overlay"><div className="tools-debug-overlay__head"><span>LIVE DEBUG PANEL</span><button type="button" onClick={() => setDebugOpen(false)} aria-label="Close debug overlay"><X size={13} /></button></div><div><span>APP</span><strong>DATA WASTER 4.0 · PHASE 17</strong></div><div><span>VIEWPORT</span><strong>{snapshot.viewport} · DPR {snapshot.pixelRatio}</strong></div><div><span>NETWORK</span><strong>{snapshot.online ? 'ONLINE' : 'OFFLINE'} · {snapshot.connectionType}</strong></div><div><span>RESOURCES</span><strong>{snapshot.resourceCount} entries · {formatBytesCompact(snapshot.resourceDecodedBytes)} decoded</strong></div><div><span>CAPTURED</span><strong>{new Date(snapshot.capturedAt).toLocaleTimeString()}</strong></div></div> : <p className="tools-footnote">Enable the overlay to inspect a compact live diagnostic panel. It is local to this page and does not collect telemetry.</p>}
          </section>
          <section className="tools-info-strip"><AlertCircle size={17} /><p><strong>Measurement caveats.</strong> Browser APIs may hide memory, network and cross-origin resource details. These values are diagnostics, not a certified benchmark. No telemetry is sent to Data Waster.</p></section>
        </>
      )}

      {tab === 'components' && (
        <>
          <div className="tools-section-intro"><div><p className="eyebrow">DESIGN SYSTEM</p><h2>Component laboratory.</h2><p>A small preview of reusable controls and status patterns used across Data Waster.</p></div><Layers3 size={22} /></div>
          <div className="tools-grid tools-grid--two">
            <section className="tools-card"><div className="tools-card__heading"><span className="tools-card__icon"><Layers3 size={17} /></span><div><h3>Buttons and states</h3><p>Primary, quiet, disabled and interactive examples.</p></div></div><div className="tools-showcase-row"><button className="button button--primary" type="button" onClick={() => setNotice('Primary component action works.')}>Primary action <Check size={13} /></button><button className="button button--quiet" type="button" onClick={() => setShowComponentNote((current) => !current)}>Toggle note</button><button className="button button--disabled" type="button" disabled>Disabled</button></div>{showComponentNote && <div className="tools-inline-note">Component actions are wired and keyboard accessible.</div>}<div className="tools-showcase-row"><span className="tools-state tools-state--due">Ready</span><span className="tools-state tools-state--scheduled">Scheduled</span><span className="tools-state tools-state--dismissed">Unavailable</span></div></section>
            <section className="tools-card"><div className="tools-card__heading"><span className="tools-card__icon"><Braces size={17} /></span><div><h3>Input patterns</h3><p>Labels, helper text and selected controls.</p></div></div><label className="tools-field tools-field--full"><span>Example field</span><input type="text" defaultValue="Data Waster" /></label><label className="tools-field tools-field--full"><span>Example selection</span><select defaultValue="healthy"><option value="healthy">Healthy</option><option value="testing">Testing</option><option value="paused">Paused</option></select></label><p className="tools-footnote">Controls should include visible labels, useful validation and clear focus states.</p></section>
          </div>
          <section className="tools-card"><div className="tools-card__heading"><span className="tools-card__icon"><ShieldCheck size={17} /></span><div><h3>Design system notes</h3><p>Patterns to reuse in upcoming phases.</p></div></div><div className="tools-component-notes"><div><Check size={14} /><span><strong>Accessible controls</strong><small>Native buttons and inputs, visible labels and focus rings.</small></span></div><div><Check size={14} /><span><strong>Consistent feedback</strong><small>Use role=status for confirmations and role=alert for errors.</small></span></div><div><Check size={14} /><span><strong>Honest status</strong><small>Do not label a browser-only or local feature as a cloud service.</small></span></div></div></section>
        </>
      )}

      <footer className="tools-page-footer"><ShieldCheck size={14} /> Local-first tools · No diagnostic telemetry · Browser permissions apply</footer>
    </div>
  );
}

function DiagnosticMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <article className="tools-diagnostic-metric"><span className="tools-diagnostic-metric__icon">{icon}</span><span className="tools-diagnostic-metric__label">{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

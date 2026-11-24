import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Clock3,
  DownloadCloud,
  Gauge,
  History,
  Pause,
  Play,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/ui/PageHeading';
import { StatusPill } from '../components/ui/StatusPill';
import { DownloadEngine, type DownloadSnapshot } from '../features/downloader/DownloadEngine';
import { DOWNLOAD_LIMITS, DEFAULT_DOWNLOAD_ENDPOINT } from '../features/downloader/downloadConfig';
import { formatBytes, formatDuration, formatSpeed } from '../features/downloader/format';
import { readSessions, saveSession, type DownloadSessionRecord } from '../features/sessions/sessionStorage';

const MIB = 1024 ** 2;
const GIB = 1024 ** 3;
const MAX_TARGET = DOWNLOAD_LIMITS.maxTargetBytes;

const presets = [
  { label: '100 MB', bytes: 100 * MIB },
  { label: '500 MB', bytes: 500 * MIB },
  { label: '1 GB', bytes: GIB },
  { label: '2 GB', bytes: 2 * GIB },
  { label: '5 GB', bytes: 5 * GIB },
];

type TargetUnit = 'MB' | 'GB' | 'TB';
const unitMultipliers: Record<TargetUnit, number> = { MB: MIB, GB: GIB, TB: 1024 ** 4 };

function emptySnapshot(targetBytes: number): DownloadSnapshot {
  return {
    sessionId: '',
    status: 'idle',
    targetBytes,
    transferredBytes: 0,
    bytesPerSecond: 0,
    peakSpeedBps: 0,
    elapsedMs: 0,
    activeTransfers: 0,
    requestCount: 0,
    startedAt: null,
    notice: null,
    errorMessage: null,
    samples: [],
  };
}

function persistSnapshot(snapshot: DownloadSnapshot): void {
  if (!snapshot.sessionId || !snapshot.startedAt || snapshot.transferredBytes <= 0) return;
  if (!['completed', 'stopped', 'error'].includes(snapshot.status)) return;
  saveSession({
    id: snapshot.sessionId,
    startedAt: snapshot.startedAt,
    finishedAt: Date.now(),
    status: snapshot.status as 'completed' | 'stopped' | 'error',
    targetBytes: snapshot.targetBytes,
    transferredBytes: snapshot.transferredBytes,
    elapsedMs: snapshot.elapsedMs,
    averageSpeedBps: snapshot.elapsedMs > 0 ? (snapshot.transferredBytes * 1000) / snapshot.elapsedMs : 0,
    peakSpeedBps: snapshot.peakSpeedBps,
    requestCount: snapshot.requestCount,
  });
}

function statusLabel(status: DownloadSnapshot['status']): string {
  switch (status) {
    case 'running': return 'TRANSFER ACTIVE';
    case 'paused': return 'PAUSED';
    case 'completed': return 'TARGET REACHED';
    case 'stopped': return 'STOPPED';
    case 'error': return 'TRANSFER ERROR';
    default: return 'ENGINE READY';
  }
}

function statusTone(status: DownloadSnapshot['status']): 'neutral' | 'success' | 'warning' {
  if (status === 'running' || status === 'completed') return 'success';
  if (status === 'paused' || status === 'stopped' || status === 'error') return 'warning';
  return 'neutral';
}

export function OverviewPage() {
  const [targetBytes, setTargetBytes] = useState(1 * GIB);
  const [targetInput, setTargetInput] = useState('1');
  const [targetUnit, setTargetUnit] = useState<TargetUnit>('GB');
  const [targetError, setTargetError] = useState<string | null>(null);
  const [concurrency, setConcurrency] = useState<number>(DOWNLOAD_LIMITS.defaultConcurrency);
  const [confirmedDataUse, setConfirmedDataUse] = useState(false);
  const [snapshot, setSnapshot] = useState<DownloadSnapshot>(() => emptySnapshot(1 * GIB));
  const [recentSessions, setRecentSessions] = useState<DownloadSessionRecord[]>(() => readSessions().slice(0, 3));
  const engineRef = useRef<DownloadEngine | null>(null);
  const persistedIds = useRef(new Set<string>());
  const isMounted = useRef(true);

  const isActive = snapshot.status === 'running' || snapshot.status === 'paused';
  const isTerminal = ['completed', 'stopped', 'error'].includes(snapshot.status);
  const progress = snapshot.targetBytes > 0
    ? Math.min(100, (snapshot.transferredBytes / snapshot.targetBytes) * 100)
    : 0;

  useEffect(() => {
    if (isTerminal && snapshot.sessionId && !persistedIds.current.has(snapshot.sessionId)) {
      persistSnapshot(snapshot);
      setRecentSessions(readSessions().slice(0, 3));
      persistedIds.current.add(snapshot.sessionId);
    }
  }, [isTerminal, snapshot]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      const engine = engineRef.current;
      if (!engine) return;
      const before = engine.getSnapshot();
      if (before.status === 'running' || before.status === 'paused') engine.stop();
      const after = engine.getSnapshot();
      persistSnapshot(after);
      engine.dispose();
    };
  }, []);

  function selectPreset(bytes: number) {
    if (isActive) return;
    setTargetBytes(bytes);
    setSnapshot(emptySnapshot(bytes));
    setTargetError(null);
    setConfirmedDataUse(false);
  }

  function applyCustomTarget() {
    const value = Number(targetInput);
    if (!Number.isFinite(value) || value <= 0) {
      setTargetError('Enter a number greater than zero.');
      return;
    }
    const bytes = Math.round(value * unitMultipliers[targetUnit]);
    if (!Number.isSafeInteger(bytes) || bytes < 1) {
      setTargetError('That target is too small to represent.');
      return;
    }
    if (bytes > MAX_TARGET) {
      setTargetError(`The current per-session safety limit is ${formatBytes(MAX_TARGET)}.`);
      return;
    }
    if (isActive) return;
    setTargetBytes(bytes);
    setSnapshot(emptySnapshot(bytes));
    setTargetError(null);
    setConfirmedDataUse(false);
  }

  async function startSession() {
    if (!confirmedDataUse || isActive || engineRef.current?.getSnapshot().status === 'running') return;
    const previous = engineRef.current;
    if (previous) previous.dispose();
    engineRef.current = null;
    setTargetError(null);
    persistedIds.current.delete(snapshot.sessionId);

    try {
      const engine = new DownloadEngine({
        endpoint: DEFAULT_DOWNLOAD_ENDPOINT,
        targetBytes,
        concurrency,
        chunkBytes: DOWNLOAD_LIMITS.defaultChunkBytes,
      }, (nextSnapshot) => {
        if (isMounted.current) setSnapshot(nextSnapshot);
      });
      engineRef.current = engine;
      setSnapshot(engine.getSnapshot());
      await engine.start();
    } catch (error) {
      setSnapshot({
        ...emptySnapshot(targetBytes),
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Could not start the download engine.',
      });
    }
  }

  function pauseOrResume() {
    const engine = engineRef.current;
    if (!engine) return;
    if (snapshot.status === 'running') engine.pause();
    else if (snapshot.status === 'paused') void engine.resume();
  }

  function stopSession() {
    engineRef.current?.stop();
  }

  function resetSession() {
    if (isActive) return;
    engineRef.current?.dispose();
    engineRef.current = null;
    setSnapshot(emptySnapshot(targetBytes));
    setConfirmedDataUse(false);
  }

  const metricCards = [
    { label: 'DATA TRANSFERRED', value: formatBytes(snapshot.transferredBytes), detail: `of ${formatBytes(snapshot.targetBytes)} target`, icon: ArrowDownToLine, tone: 'green' },
    { label: 'DOWNLOAD SPEED', value: formatSpeed(snapshot.bytesPerSecond), detail: `Peak ${formatSpeed(snapshot.peakSpeedBps)}`, icon: Gauge, tone: 'blue' },
    { label: 'SESSION TIME', value: formatDuration(snapshot.elapsedMs), detail: 'Active transfer time', icon: Clock3, tone: 'violet' },
    { label: 'ACTIVE TRANSFERS', value: String(snapshot.activeTransfers), detail: `${snapshot.requestCount} requests started`, icon: RadioTower, tone: 'amber' },
  ] as const;

  const chartSamples = snapshot.samples.slice(-30);
  const chartMaximum = Math.max(1, ...chartSamples.map((sample) => sample.bytesPerSecond));

  return (
    <div className="page-stack dashboard-page">
      <PageHeading
        eyebrow="DATA WASTER / CONTROL CENTER"
        title="Your data. Your rules."
        description="Set a transfer target, choose how many requests to run at once, and watch real downloaded bytes add up."
        action={<StatusPill tone={statusTone(snapshot.status)}>{statusLabel(snapshot.status)}</StatusPill>}
      />

      <section className={`dashboard-hero${snapshot.status === 'running' ? ' dashboard-hero--active' : ''}`} aria-labelledby="dashboard-hero-title">
        <div className="dashboard-hero__copy">
          <div className="dashboard-hero__eyebrow"><Sparkles size={14} /> DATA WASTER 4.0 <span>/</span> CONTROL CENTER</div>
          <h2 id="dashboard-hero-title">Make every byte<br /><span>count for nothing.</span></h2>
          <p>The download engine is ready. Each session uses real internet data, reports bytes read from the response stream, and stops when the target is reached or you hit stop.</p>
          <div className="dashboard-hero__actions">
            <button className="button button--primary" type="button" onClick={() => document.getElementById('target-picker')?.scrollIntoView({ behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth', block: 'start' })}>Configure a transfer <ArrowRight size={15} /></button>
            <Link to="/settings" className="button button--quiet">Personalize workspace <ArrowUpRight size={14} /></Link>
          </div>
          <div className="dashboard-hero__trust"><span><ShieldCheck size={13} /> Hard target limit</span><span><CheckCircle2 size={13} /> Emergency stop ready</span></div>
        </div>
        <div className="reactor-card" aria-label={`Download engine status: ${snapshot.status}`}>
          <div className="reactor-card__top"><span>CORE STATUS</span><span className="reactor-card__status"><i /> {snapshot.status.toUpperCase()}</span></div>
          <div className="reactor" aria-hidden="true">
            <div className="reactor__ring reactor__ring--outer" />
            <div className="reactor__ring reactor__ring--middle" />
            <div className="reactor__ring reactor__ring--inner" />
            <div className="reactor__core"><Zap size={27} fill="currentColor" /></div>
            <span className="reactor__node reactor__node--one" />
            <span className="reactor__node reactor__node--two" />
            <span className="reactor__node reactor__node--three" />
          </div>
          <div className="reactor-card__bottom"><strong>{(snapshot.bytesPerSecond / 1024 ** 2).toFixed(2)} <small>MB/s</small></strong><span>{snapshot.status === 'running' ? 'Receiving data' : 'Transfer throughput'}</span></div>
        </div>
        <div className="dashboard-hero__grid" aria-hidden="true" />
      </section>

      <section className="metric-grid" aria-label="Current session statistics" aria-live="polite">
        {metricCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="metric-card" key={label}>
            <div className={`metric-card__icon metric-card__icon--${tone}`}><Icon size={17} /></div>
            <div className="metric-card__label">{label}</div>
            <div className="metric-card__value">{value}</div>
            <div className="metric-card__detail">{detail}</div>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel target-panel" id="target-picker">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">SESSION CONFIGURATION</p><h2>Choose your target</h2></div>
            <StatusPill tone={isActive ? 'success' : 'neutral'}><CircleGauge size={12} /> {formatBytes(targetBytes)}</StatusPill>
          </div>
          <p className="dashboard-panel__description">Choose a preset or enter a custom amount. The per-session limit is {formatBytes(MAX_TARGET)} to avoid accidental runaway transfers.</p>
          <div className="target-options" role="group" aria-label="Choose a data target">
            {presets.map((target) => (
              <button
                className={`target-option${targetBytes === target.bytes ? ' target-option--selected' : ''}`}
                key={target.label}
                type="button"
                disabled={isActive}
                onClick={() => selectPreset(target.bytes)}
                aria-pressed={targetBytes === target.bytes}
              >
                {target.label}
              </button>
            ))}
          </div>

          <div className="custom-target-row">
            <label className="custom-target-field"><span>Custom amount</span><input type="number" min="0.000001" step="any" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} disabled={isActive} /></label>
            <label className="custom-target-field custom-target-field--unit"><span>Unit</span><select value={targetUnit} onChange={(event) => setTargetUnit(event.target.value as TargetUnit)} disabled={isActive}><option>MB</option><option>GB</option><option>TB</option></select></label>
            <button className="button button--quiet custom-target-apply" type="button" onClick={applyCustomTarget} disabled={isActive}>Apply</button>
          </div>
          {targetError && <p className="inline-error" role="alert">{targetError}</p>}

          <div className="target-summary">
            <div><span>TRANSFER PROGRESS</span><strong>{formatBytes(snapshot.transferredBytes)} <small>/ {formatBytes(snapshot.targetBytes)}</small></strong></div>
            <div className="target-summary__tag"><CircleGauge size={14} /> {progress.toFixed(1)}% complete</div>
          </div>
          <div className="progress-track" role="progressbar" aria-label="Data transfer progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>

          <div className="engine-options">
            <label className="engine-option-field"><span>Parallel streams</span><select value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))} disabled={isActive}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'stream' : 'streams'}</option>)}</select></label>
            <div className="engine-option-note"><span>Chunk size</span><strong>{formatBytes(DOWNLOAD_LIMITS.defaultChunkBytes)}</strong></div>
          </div>

          <label className="data-use-confirm"><input type="checkbox" checked={confirmedDataUse} onChange={(event) => setConfirmedDataUse(event.target.checked)} disabled={isActive} /><span>I understand this transfers real internet data and may consume a metered plan or incur charges.</span></label>

          {!isActive && !isTerminal && (
            <button className="button button--primary target-start" type="button" onClick={() => void startSession()} disabled={!confirmedDataUse || Boolean(targetError)}>
              <Play size={15} fill="currentColor" /> Start wasting data
            </button>
          )}
          {snapshot.status === 'running' && (
            <div className="engine-controls">
              <button className="button button--quiet" type="button" onClick={pauseOrResume}><Pause size={14} /> Pause</button>
              <button className="button button--danger" type="button" onClick={stopSession}><Square size={13} fill="currentColor" /> Emergency stop</button>
            </div>
          )}
          {snapshot.status === 'paused' && (
            <div className="engine-controls">
              <button className="button button--primary" type="button" onClick={pauseOrResume}><Play size={14} fill="currentColor" /> Resume</button>
              <button className="button button--danger" type="button" onClick={stopSession}><Square size={13} fill="currentColor" /> Stop session</button>
            </div>
          )}
          {isTerminal && <button className="button button--primary target-start" type="button" onClick={resetSession}>New session <ArrowRight size={14} /></button>}

          {snapshot.notice && <p className="engine-notice" role="status">{snapshot.notice}</p>}
          {snapshot.errorMessage && <p className="inline-error" role="alert"><ShieldAlert size={14} /> {snapshot.errorMessage}</p>}
          <p className="target-note">Payload: GitHub Pages same-origin static file. Requests use byte ranges and stop when the target is reached. A final stream chunk is bounded by the selected target; browser counters do not include protocol overhead.</p>
        </article>

        <article className="dashboard-panel activity-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">TRANSFER MONITOR</p><h2>Live activity</h2></div>
            <span className="chart-period">SESSION / LIVE</span>
          </div>
          <div className="activity-summary"><strong>{formatSpeed(snapshot.bytesPerSecond)}</strong><span><i className={snapshot.status === 'running' ? 'is-live' : ''} /> {snapshot.status === 'running' ? 'Receiving data' : snapshot.status === 'paused' ? 'Transfer paused' : 'No active traffic'}</span></div>
          <div className="activity-chart activity-chart--live" role="img" aria-label={`${chartSamples.length} recent download speed measurements`}>
            <div className="activity-chart__grid"><span /><span /><span /><span /></div>
            {chartSamples.length > 0 ? (
              <div className="activity-chart__bars" aria-hidden="true">
                {chartSamples.map((sample, index) => <i key={`${sample.at}-${index}`} style={{ height: `${Math.max(5, (sample.bytesPerSecond / chartMaximum) * 100)}%` }} />)}
              </div>
            ) : <div className="activity-chart__empty"><Activity size={16} /> Waiting for session data</div>}
          </div>
          <div className="chart-axis"><span>EARLIER</span><span>BYTES RECEIVED / SECOND</span><span>NOW</span></div>
          <div className="activity-footnote">Speed is estimated from bytes read by the browser over recent time windows. Some browser and server buffering may smooth short spikes.</div>
          <div className="activity-details">
            <div><span>REQUESTS</span><strong>{snapshot.requestCount}</strong></div>
            <div><span>PARALLEL STREAMS</span><strong>{concurrency}</strong></div>
            <div><span>ELAPSED</span><strong>{formatDuration(snapshot.elapsedMs)}</strong></div>
          </div>
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="dashboard-panel recent-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">YOUR ACTIVITY</p><h2>Recent sessions</h2></div>
            <Link to="/analytics" className="text-link">View analytics <ArrowUpRight size={13} /></Link>
          </div>
          {recentSessions.length > 0 ? (
            <div className="recent-session-list">
              {recentSessions.map((session) => (
                <div className="recent-session-row" key={session.id}>
                  <span className={`recent-session-dot recent-session-dot--${session.status}`} />
                  <div className="recent-session-row__main">
                    <strong>{formatBytes(session.transferredBytes)} transferred</strong>
                    <small>{new Date(session.startedAt).toLocaleString()} · {formatDuration(session.elapsedMs)}</small>
                  </div>
                  <div className="recent-session-row__meta">
                    <strong>{session.status.toUpperCase()}</strong>
                    <small>{formatSpeed(session.averageSpeedBps)} avg</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon"><History size={19} /></div>
              <strong>No sessions yet</strong>
              <p>Completed, stopped and failed sessions will be saved in this browser. Open Analytics for your saved session reports and personal records.</p>
            </div>
          )}
        </article>

        <article className="dashboard-panel quick-panel">
          <div className="dashboard-panel__heading"><div><p className="eyebrow">WORKSPACE</p><h2>Explore Data Waster</h2></div></div>
          <Link to="/laboratory" className="quick-link"><span className="quick-link__icon quick-link__icon--blue"><RadioTower size={16} /></span><span><strong>Network laboratory</strong><small>Network diagnostics and connection tools</small></span><ArrowUpRight size={14} /></Link>
          <Link to="/analytics" className="quick-link"><span className="quick-link__icon quick-link__icon--green"><BarChart3 size={16} /></span><span><strong>Analytics center</strong><small>Session insights and records</small></span><ArrowUpRight size={14} /></Link>
          <Link to="/arcade" className="quick-link"><span className="quick-link__icon quick-link__icon--violet"><Sparkles size={16} /></span><span><strong>Arcade</strong><small>Mini-games, daily missions and XP rewards</small></span><ArrowUpRight size={14} /></Link>
        </article>
      </section>

      <div className="dashboard-footnote"><DownloadCloud size={14} /><span>PHASE 3 · DOWNLOAD ENGINE</span><i /> <span>MAX SESSION {formatBytes(MAX_TARGET)}</span><i /> <span>UP TO {DOWNLOAD_LIMITS.maxConcurrency} STREAMS</span></div>
    </div>
  );
}

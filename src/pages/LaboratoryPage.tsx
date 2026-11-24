import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity, AlertCircle, ArrowDownToLine, CheckCircle2, Clock3, Copy, Globe2,
  Info, LoaderCircle, Network, RadioTower, RefreshCw, Search, ShieldCheck,
  Signal, SquareActivity, Wifi, WifiOff, Zap,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { StatusPill } from '../components/ui/StatusPill';
import {
  addNetworkEvent,
  calculateLatencyStats,
  fetchPublicIp,
  getBrowserNetworkSnapshot,
  inspectHttpHeaders,
  lookupDnsRecords,
  probeHttpLatency,
  readNetworkEvents,
  runSmallDownloadBenchmark,
  summarizeResourceTraffic,
  type BrowserNetworkSnapshot,
  type HeaderInspection,
  type LatencyProbe,
  type ResourceTrafficSummary,
} from '../features/network/networkDiagnostics';

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function LaboratoryPage() {
  const [network, setNetwork] = useState<BrowserNetworkSnapshot>(() => getBrowserNetworkSnapshot());
  const [samples, setSamples] = useState<LatencyProbe[]>([]);
  const [probeBusy, setProbeBusy] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [ipBusy, setIpBusy] = useState(false);
  const [domain, setDomain] = useState('example.com');
  const [dnsBusy, setDnsBusy] = useState(false);
  const [dnsResult, setDnsResult] = useState<{ domain: string; records: Array<{ address: string; ttl: number | null; type: number }>; status: number } | null>(null);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [inspectUrl, setInspectUrl] = useState('https://example.com');
  const [headersBusy, setHeadersBusy] = useState(false);
  const [headerResult, setHeaderResult] = useState<HeaderInspection | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [benchmarkBusy, setBenchmarkBusy] = useState(false);
  const [benchmark, setBenchmark] = useState<{ bytes: number; durationMs: number; megabitsPerSecond: number } | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [traffic, setTraffic] = useState<ResourceTrafficSummary | null>(null);
  const [events, setEvents] = useState(() => readNetworkEvents());
  const probeInFlight = useRef(false);

  const latencyStats = useMemo(() => calculateLatencyStats(samples.slice(-20)), [samples]);
  const latestSample = samples[samples.length - 1];

  const recordEvent = useCallback((title: string, detail: string, tone: 'good' | 'warning' | 'neutral' = 'neutral') => {
    setEvents(addNetworkEvent(title, detail, tone));
  }, []);

  const takeProbe = useCallback(async (source: 'manual' | 'monitor') => {
    if (probeInFlight.current) return null;
    probeInFlight.current = true;
    try {
      const result = await probeHttpLatency();
      setSamples((current) => [...current, result].slice(-40));
      if (source === 'monitor') {
        recordEvent(result.ok ? 'HTTP probe succeeded' : 'HTTP probe failed', result.ok ? `${Math.round(result.latencyMs ?? 0)} ms response time` : (result.error ?? 'Probe failed'), result.ok ? 'good' : 'warning');
      }
      return result;
    } finally {
      probeInFlight.current = false;
    }
  }, [recordEvent]);

  useEffect(() => {
    const refreshNetwork = () => setNetwork(getBrowserNetworkSnapshot());
    const handleOnline = () => {
      refreshNetwork();
      recordEvent('Connection restored', 'The browser reported that it is online.', 'good');
    };
    const handleOffline = () => {
      refreshNetwork();
      setMonitoring(false);
      recordEvent('Connection lost', 'The browser reported that it is offline. The stability monitor was stopped.', 'warning');
    };
    const nav = navigator as Navigator & { connection?: EventTarget; mozConnection?: EventTarget; webkitConnection?: EventTarget };
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    connection?.addEventListener('change', refreshNetwork);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener('change', refreshNetwork);
    };
  }, [recordEvent]);

  useEffect(() => {
    if (!monitoring) return undefined;
    void takeProbe('monitor');
    const interval = window.setInterval(() => void takeProbe('monitor'), 10_000);
    return () => window.clearInterval(interval);
  }, [monitoring, takeProbe]);

  const runLatencyTest = async () => {
    if (monitoring) setMonitoring(false);
    setProbeBusy(true);
    const results: LatencyProbe[] = [];
    try {
      for (let index = 0; index < 5; index += 1) {
        // If the periodic monitor had a request in flight, let it finish first
        // so the manual five-sample test remains sequential and predictable.
        while (probeInFlight.current) await wait(100);
        const sample = await takeProbe('manual');
        if (sample) results.push(sample);
        if (index < 4) await wait(350);
      }
      const stats = calculateLatencyStats(results);
      recordEvent('Latency test completed', `${stats.successCount}/${results.length} HTTP probes succeeded`, stats.successCount === results.length && results.length === 5 ? 'good' : 'warning');
    } finally {
      setProbeBusy(false);
    }
  };

  const toggleMonitor = () => {
    const next = !monitoring;
    setMonitoring(next);
    recordEvent(next ? 'Stability monitor started' : 'Stability monitor stopped', next ? 'One small HTTP probe will run every 10 seconds.' : 'Background HTTP probes have stopped.', 'neutral');
  };

  const handleFetchIp = async () => {
    setIpBusy(true);
    setPublicIp(null);
    try {
      const ip = await fetchPublicIp();
      setPublicIp(ip);
      recordEvent('Public IP retrieved', 'The IP information service responded successfully.', 'good');
    } catch (error) {
      recordEvent('Public IP lookup failed', error instanceof Error ? error.message : 'Lookup failed.', 'warning');
      setPublicIp('Unavailable — check connection or CORS access.');
    } finally {
      setIpBusy(false);
    }
  };

  const handleDnsLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDnsBusy(true);
    setDnsError(null);
    setDnsResult(null);
    try {
      const result = await lookupDnsRecords(domain);
      setDnsResult(result);
      recordEvent('DNS lookup completed', `${result.records.length} A record(s) found for ${result.domain}.`, result.records.length ? 'good' : 'warning');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DNS lookup failed.';
      setDnsError(message);
      recordEvent('DNS lookup failed', message, 'warning');
    } finally {
      setDnsBusy(false);
    }
  };

  const handleHeaderInspect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHeadersBusy(true);
    setHeaderError(null);
    setHeaderResult(null);
    try {
      const result = await inspectHttpHeaders(inspectUrl);
      setHeaderResult(result);
      recordEvent('HTTP headers inspected', `${result.status} response from ${new URL(result.url).host}.`, 'good');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Header inspection failed.';
      setHeaderError(`${message} The target server must allow browser CORS requests and HEAD requests.`);
      recordEvent('HTTP header inspection failed', message, 'warning');
    } finally {
      setHeadersBusy(false);
    }
  };

  const handleBenchmark = async () => {
    setBenchmarkBusy(true);
    setBenchmarkError(null);
    setBenchmark(null);
    try {
      const result = await runSmallDownloadBenchmark();
      setBenchmark(result);
      recordEvent('1 MiB download benchmark completed', `${result.megabitsPerSecond.toFixed(2)} Mbps measured`, 'good');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Benchmark failed.';
      setBenchmarkError(`${message} The test reads a 1 MiB range from this GitHub Pages site.`);
      recordEvent('Download benchmark failed', message, 'warning');
    } finally {
      setBenchmarkBusy(false);
    }
  };

  const refreshTraffic = () => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const summary = summarizeResourceTraffic(entries);
    setTraffic(summary);
    recordEvent('Page resource snapshot captured', `${summary.resourceCount} resources inspected; ${formatBytes(summary.totalTransferBytes)} measurable transfer size.`, 'neutral');
  };

  const copyIp = async () => {
    if (!publicIp || publicIp.startsWith('Unavailable')) return;
    try {
      await navigator.clipboard.writeText(publicIp);
      recordEvent('Public IP copied', 'Copied to clipboard.', 'good');
    } catch {
      recordEvent('Clipboard unavailable', 'Your browser did not allow clipboard access.', 'warning');
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="WORKSPACE / LABORATORY"
        title="Internet laboratory"
        description="Inspect the browser's network hints, measure HTTP response times, resolve domains and examine public response headers."
        action={<StatusPill tone={network.online ? 'success' : 'warning'}>{network.online ? 'BROWSER ONLINE' : 'BROWSER OFFLINE'}</StatusPill>}
      />

      <section className="lab-hero">
        <div className="lab-hero__copy">
          <div className="lab-hero__eyebrow"><RadioTower size={14} /> NETWORK INTELLIGENCE CENTER</div>
          <h2>Know what your connection is doing.</h2>
          <p>Run lightweight, on-demand diagnostics. Tests only run when you start them, except the stability monitor which checks every 10 seconds while enabled.</p>
          <div className="lab-hero__actions">
            <button type="button" className="button button--primary" onClick={runLatencyTest} disabled={probeBusy || !network.online}>
              {probeBusy ? <LoaderCircle size={14} className="spin" /> : <Activity size={14} />}
              {probeBusy ? 'Testing connection…' : 'Run 5-probe test'}
            </button>
            <button type="button" className="button button--quiet" onClick={toggleMonitor}>
              {monitoring ? <WifiOff size={14} /> : <Wifi size={14} />}
              {monitoring ? 'Stop monitor' : 'Start stability monitor'}
            </button>
          </div>
        </div>
        <div className="lab-hero__signal" aria-hidden="true">
          <div className="lab-signal-ring lab-signal-ring--outer" />
          <div className="lab-signal-ring lab-signal-ring--inner" />
          <div className="lab-signal-core"><Signal size={31} /></div>
          <span className="lab-signal-label">{monitoring ? 'MONITORING' : 'READY'}</span>
        </div>
      </section>

      <section className="lab-metric-grid" aria-label="Connection metrics">
        <article className="lab-metric-card">
          <span className="lab-metric-card__icon lab-metric-card__icon--green"><Activity size={16} /></span>
          <span className="lab-metric-card__label">LATEST HTTP RESPONSE</span>
          <strong>{latestSample?.ok ? `${Math.round(latestSample.latencyMs ?? 0)} ms` : latestSample ? 'Failed' : '—'}</strong>
          <small>{latestSample ? formatTime(latestSample.at) : 'Run a probe to measure'}</small>
        </article>
        <article className="lab-metric-card">
          <span className="lab-metric-card__icon lab-metric-card__icon--blue"><Zap size={16} /></span>
          <span className="lab-metric-card__label">AVERAGE HTTP RTT</span>
          <strong>{latencyStats.averageMs === null ? '—' : `${latencyStats.averageMs} ms`}</strong>
          <small>{latencyStats.successCount} successful probe(s)</small>
        </article>
        <article className="lab-metric-card">
          <span className="lab-metric-card__icon lab-metric-card__icon--violet"><Activity size={16} /></span>
          <span className="lab-metric-card__label">JITTER ESTIMATE</span>
          <strong>{latencyStats.jitterMs === null ? '—' : `${latencyStats.jitterMs} ms`}</strong>
          <small>Mean change between successful samples</small>
        </article>
        <article className="lab-metric-card">
          <span className="lab-metric-card__icon lab-metric-card__icon--amber"><ShieldCheck size={16} /></span>
          <span className="lab-metric-card__label">HTTP PROBE SUCCESS</span>
          <strong>{latencyStats.count ? `${Math.round(latencyStats.successRate)}%` : '—'}</strong>
          <small>{latencyStats.successCount}/{latencyStats.count} recent probes</small>
        </article>
      </section>

      <div className="lab-grid lab-grid--primary">
        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">DEVICE REPORT</p><h2>Browser network inspector</h2></div>
            <Network size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">Information exposed by your browser. Some devices and browsers do not provide all fields.</p>
          <div className="lab-info-list">
            <div><span>Connection state</span><strong className={network.online ? 'lab-value--good' : 'lab-value--bad'}>{network.online ? 'Online' : 'Offline'}</strong></div>
            <div><span>Effective connection type</span><strong>{network.effectiveType?.toUpperCase() ?? 'Not exposed'}</strong></div>
            <div><span>Network type</span><strong>{network.connectionType ?? 'Not exposed'}</strong></div>
            <div><span>Estimated downlink</span><strong>{network.downlinkMbps === null ? 'Not exposed' : `${network.downlinkMbps} Mbps`}</strong></div>
            <div><span>Browser-estimated RTT</span><strong>{network.estimatedRttMs === null ? 'Not exposed' : `${network.estimatedRttMs} ms`}</strong></div>
            <div><span>Data saver</span><strong>{network.saveData === null ? 'Not exposed' : network.saveData ? 'Enabled' : 'Disabled'}</strong></div>
          </div>
          <div className="lab-note"><Info size={14} /> Browser connection hints are estimates and may be missing. They are not a speed test.</div>
        </section>

        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">PUBLIC NETWORK</p><h2>Public IP information</h2></div>
            <Globe2 size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">Fetch your public IP from ipify only when you press the button. No location lookup is performed.</p>
          <div className="lab-ip-value">{publicIp ?? 'Not requested'}</div>
          <div className="lab-action-row">
            <button type="button" className="button button--quiet" onClick={handleFetchIp} disabled={ipBusy}>
              {ipBusy ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}
              {ipBusy ? 'Looking up…' : 'Retrieve public IP'}
            </button>
            {publicIp && !publicIp.startsWith('Unavailable') && <button type="button" className="icon-button" onClick={copyIp} aria-label="Copy public IP"><Copy size={14} /></button>}
          </div>
          <div className="lab-note"><ShieldCheck size={14} /> Your IP is shown on this page and is not saved in the event log.</div>
        </section>
      </div>

      <div className="lab-grid">
        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">DNS OVER HTTPS</p><h2>DNS lookup</h2></div>
            <Search size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">Resolve IPv4 (A) records using Google's public DNS-over-HTTPS service.</p>
          <form className="lab-form" onSubmit={handleDnsLookup}>
            <label htmlFor="lab-domain">Domain name</label>
            <div className="lab-input-row">
              <input id="lab-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" autoComplete="off" />
              <button type="submit" className="button button--primary" disabled={dnsBusy}>{dnsBusy ? <LoaderCircle size={14} className="spin" /> : <Search size={14} />} Lookup</button>
            </div>
          </form>
          {dnsError && <p className="lab-error"><AlertCircle size={14} /> {dnsError}</p>}
          {dnsResult && <div className="lab-result-block">
            <div className="lab-result-heading"><strong>{dnsResult.domain}</strong><StatusPill tone={dnsResult.records.length ? 'success' : 'warning'}>{dnsResult.records.length ? `${dnsResult.records.length} A RECORD(S)` : 'NO A RECORDS'}</StatusPill></div>
            {dnsResult.records.map((record) => <div className="lab-data-row" key={`${record.address}-${record.ttl}`}><code>{record.address}</code><span>TTL {record.ttl ?? '—'}s</span></div>)}
            {!dnsResult.records.length && <p className="lab-muted">No IPv4 A records were returned. The domain may not exist or may have no A record.</p>}
          </div>}
        </section>

        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">RESPONSE INSPECTION</p><h2>HTTP header inspector</h2></div>
            <SquareActivity size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">Send a HEAD request and inspect only headers that the target server exposes to browser JavaScript.</p>
          <form className="lab-form" onSubmit={handleHeaderInspect}>
            <label htmlFor="lab-inspect-url">HTTPS URL</label>
            <div className="lab-input-row">
              <input id="lab-inspect-url" value={inspectUrl} onChange={(event) => setInspectUrl(event.target.value)} placeholder="https://example.com" autoComplete="url" />
              <button type="submit" className="button button--primary" disabled={headersBusy}>{headersBusy ? <LoaderCircle size={14} className="spin" /> : <Search size={14} />} Inspect</button>
            </div>
          </form>
          {headerError && <p className="lab-error"><AlertCircle size={14} /> {headerError}</p>}
          {headerResult && <div className="lab-result-block">
            <div className="lab-result-heading"><strong>HTTP {headerResult.status} {headerResult.statusText}</strong><StatusPill>{headerResult.cdn}</StatusPill></div>
            <div className="lab-header-list">{headerResult.headers.length ? headerResult.headers.map(([key, value]) => <div className="lab-data-row" key={key}><code>{key}</code><span>{value}</span></div>) : <p className="lab-muted">No response headers were exposed by the browser.</p>}</div>
            <p className="lab-muted">CDN identification is a best-effort guess from visible headers, not a guarantee.</p>
          </div>}
        </section>
      </div>

      <div className="lab-grid">
        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">THROUGHPUT CHECK</p><h2>1 MiB download benchmark</h2></div>
            <ArrowDownToLine size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">A user-triggered 1 MiB range download from this GitHub Pages site. This is separate from your data-wasting session.</p>
          <button type="button" className="button button--quiet" onClick={handleBenchmark} disabled={benchmarkBusy || !network.online}>
            {benchmarkBusy ? <LoaderCircle size={14} className="spin" /> : <Zap size={14} />}
            {benchmarkBusy ? 'Measuring…' : 'Run 1 MiB benchmark'}
          </button>
          {benchmark && <div className="lab-benchmark-result">
            <strong>{benchmark.megabitsPerSecond.toFixed(2)} <small>Mbps</small></strong>
            <span>{formatBytes(benchmark.bytes)} in {(benchmark.durationMs / 1000).toFixed(2)} seconds</span>
          </div>}
          {benchmarkError && <p className="lab-error"><AlertCircle size={14} /> {benchmarkError}</p>}
          <div className="lab-note"><Info size={14} /> Actual throughput varies with server distance, browser limits, congestion and CORS. This small test is not an ISP-certified speed test.</div>
        </section>

        <section className="dashboard-panel lab-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">PAGE RESOURCE TIMING</p><h2>Traffic visualizer</h2></div>
            <Activity size={18} className="lab-heading-icon" />
          </div>
          <p className="dashboard-panel__description">Inspect resource timing entries recorded for this page. Cached and cross-origin resources may report zero transfer size.</p>
          <button type="button" className="button button--quiet" onClick={refreshTraffic}><RefreshCw size={14} /> Capture page snapshot</button>
          {traffic && <>
            <div className="lab-traffic-totals">
              <div><span>Resources</span><strong>{traffic.resourceCount}</strong></div>
              <div><span>Measurable</span><strong>{traffic.measurableCount}</strong></div>
              <div><span>Transfer size</span><strong>{formatBytes(traffic.totalTransferBytes)}</strong></div>
            </div>
            <div className="lab-host-list">{traffic.byHost.map((host) => <div className="lab-host-row" key={host.host}><span>{host.host}<small>{host.requests} request(s)</small></span><strong>{formatBytes(host.bytes)}</strong></div>)}</div>
          </>}
        </section>
      </div>

      <section className="dashboard-panel lab-panel lab-events-panel">
        <div className="dashboard-panel__heading">
          <div><p className="eyebrow">LOCAL DIAGNOSTICS</p><h2>Connection event log</h2></div>
          <div className="lab-event-actions"><span>{events.length} stored</span><button type="button" className="button button--quiet" onClick={() => { try { localStorage.removeItem('data-waster.network-events.v1'); } catch { /* Local event history is optional. */ } setEvents([]); }}>Clear log</button></div>
        </div>
        <div className="lab-event-list">
          {events.length ? events.slice(0, 10).map((event) => <div className="lab-event-row" key={event.id}>
            <span className={`lab-event-dot lab-event-dot--${event.tone}`} />
            <div><strong>{event.title}</strong><small>{event.detail}</small></div>
            <time><Clock3 size={11} /> {formatTime(event.at)}</time>
          </div>) : <div className="lab-empty"><CheckCircle2 size={18} /> No diagnostic events yet. Run a test to start the timeline.</div>}
        </div>
      </section>

      <div className="lab-disclaimer"><Info size={15} /><p><strong>Browser limitations:</strong> these are HTTP-based measurements, not ICMP ping. Web pages cannot directly inspect raw packets or reliably measure true packet loss. Header inspection depends on the destination's CORS policy and exposed headers. Resource sizes may be incomplete for cached or cross-origin assets.</p></div>
    </div>
  );
}

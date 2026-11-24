import { useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, Award, CalendarDays, Check, Clock3,
  FileJson, FileSpreadsheet, Gauge, History, Medal, RefreshCw, Search,
  ShieldAlert, Sparkles, Trophy, Trash2, TrendingUp, Zap,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { StatusPill } from '../components/ui/StatusPill';
import {
  buildDailyUsage, buildHeatmap, filterSessionsByPeriod, getPersonalRecords,
  summarizeSessions, sessionsToCsv, type AnalyticsPeriod,
} from '../features/analytics/analytics';
import { clearSessions, readSessions, type DownloadSessionRecord } from '../features/sessions/sessionStorage';
import { formatBytes, formatDuration, formatSpeed } from '../features/downloader/format';

const periodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: '7 DAYS' },
  { value: '30d', label: '30 DAYS' },
  { value: '90d', label: '90 DAYS' },
  { value: 'all', label: 'ALL TIME' },
];

function formatDate(value: number, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(undefined, style === 'long'
    ? { month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value);
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function saveCsv(sessions: DownloadSessionRecord[]): void {
  downloadTextFile('data-waster-sessions.csv', sessionsToCsv(sessions), 'text/csv;charset=utf-8');
}

function saveJson(sessions: DownloadSessionRecord[]): void {
  const report = {
    exportedAt: new Date().toISOString(),
    product: 'Data Waster 4.0',
    recordCount: sessions.length,
    sessions,
  };
  downloadTextFile('data-waster-analytics.json', JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
}

function MetricCard({ label, value, detail, icon: Icon, tone }: {
  label: string; value: string; detail: string; icon: typeof Activity;
  tone: 'green' | 'blue' | 'violet' | 'amber';
}) {
  return (
    <article className="metric-card analytics-metric">
      <div className={`metric-card__icon metric-card__icon--${tone}`}><Icon size={16} /></div>
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__detail">{detail}</div>
    </article>
  );
}

function RecordCard({ title, value, detail, icon: Icon }: {
  title: string; value: string; detail: string; icon: typeof Trophy;
}) {
  return (
    <div className="record-card">
      <span className="record-card__icon"><Icon size={16} /></span>
      <span className="record-card__copy"><small>{title}</small><strong>{value}</strong><em>{detail}</em></span>
    </div>
  );
}

function statusTone(status: DownloadSessionRecord['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'error') return 'warning';
  return 'neutral';
}

export function AnalyticsPage() {
  const [allSessions, setAllSessions] = useState<DownloadSessionRecord[]>(() => readSessions());
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DownloadSessionRecord['status']>('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const filteredSessions = useMemo(() => filterSessionsByPeriod(allSessions, period), [allSessions, period]);
  const displayedSessions = useMemo(() => filteredSessions.filter((session) => {
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesQuery = !historyQuery.trim() || session.id.toLowerCase().includes(historyQuery.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  }), [filteredSessions, historyQuery, statusFilter]);
  const summary = useMemo(() => summarizeSessions(filteredSessions), [filteredSessions]);
  const records = useMemo(() => getPersonalRecords(allSessions), [allSessions]);
  const dailyUsage = useMemo(() => buildDailyUsage(allSessions, 14), [allSessions]);
  const heatmap = useMemo(() => buildHeatmap(allSessions, 12), [allSessions]);
  const selectedSessions = useMemo(() => selectedIds
    .map((id) => allSessions.find((session) => session.id === id))
    .filter((session): session is DownloadSessionRecord => Boolean(session)), [allSessions, selectedIds]);
  const replaySession = replayId ? allSessions.find((session) => session.id === replayId) ?? null : null;
  const maxDailyBytes = Math.max(1, ...dailyUsage.map((item) => item.bytes));

  const now = new Date();
  const thisMonthSessions = allSessions.filter((session) => {
    const date = new Date(session.startedAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const thisYearSessions = allSessions.filter((session) => new Date(session.startedAt).getFullYear() === now.getFullYear());
  const monthSummary = summarizeSessions(thisMonthSessions);
  const yearSummary = summarizeSessions(thisYearSessions);
  const topMonthDay = buildDailyUsage(thisMonthSessions, now.getDate())
    .reduce((best, day) => day.bytes > best.bytes ? day : best, { dateKey: '', date: new Date(), bytes: 0, sessions: 0, peakSpeedBps: 0 });

  function refreshSessions() {
    setAllSessions(readSessions());
    setNotice('Analytics refreshed from locally saved sessions.');
    window.setTimeout(() => setNotice(null), 3500);
  }

  function toggleCompare(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : [current[1], id]);
  }

  function handleClearHistory() {
    if (allSessions.length === 0) return;
    const confirmed = window.confirm('Delete all locally saved download session records? This cannot be undone.');
    if (!confirmed) return;
    const cleared = clearSessions();
    if (cleared) {
      setAllSessions([]);
      setSelectedIds([]);
      setReplayId(null);
      setNotice('Local session history cleared.');
    } else {
      setNotice('Could not clear local history. Check browser storage permissions.');
    }
    window.setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="page-stack analytics-page">
      <PageHeading
        eyebrow="WORKSPACE / ANALYTICS"
        title="Your data story."
        description="Real session records, personal bests and usage patterns from this browser. Your history stays on this device."
        action={<StatusPill tone="success">LOCAL ANALYTICS</StatusPill>}
      />

      <section className="analytics-hero">
        <div className="analytics-hero__copy">
          <div className="analytics-hero__eyebrow"><Sparkles size={14} /> YOUR PERSONAL DATA REPORT</div>
          <h2>Every session<br /><span>leaves a story.</span></h2>
          <p>Explore the bytes transferred, the time spent and your best download performances. Reports are calculated from saved Data Waster sessions—not simulated data.</p>
          <div className="analytics-hero__meta">
            <span><History size={13} /> {allSessions.length} saved records</span>
            <span><ShieldAlert size={13} /> Stored in this browser</span>
          </div>
        </div>
        <div className="analytics-hero__score">
          <div className="analytics-hero__score-label">ALL-TIME TRANSFERRED</div>
          <strong>{formatBytes(summarizeSessions(allSessions).transferredBytes)}</strong>
          <span><ArrowDownToLine size={13} /> Across {allSessions.length} sessions</span>
        </div>
      </section>

      <div className="analytics-toolbar">
        <div className="analytics-period" role="group" aria-label="Analytics date range">
          {periodOptions.map((option) => (
            <button key={option.value} type="button" className={period === option.value ? 'analytics-period__button analytics-period__button--active' : 'analytics-period__button'} onClick={() => setPeriod(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="analytics-toolbar__actions">
          <button type="button" className="button button--quiet" onClick={refreshSessions}><RefreshCw size={13} /> Refresh</button>
          <button type="button" className="button button--quiet" onClick={() => saveCsv(filteredSessions)} disabled={!filteredSessions.length}><FileSpreadsheet size={13} /> CSV</button>
          <button type="button" className="button button--quiet" onClick={() => saveJson(filteredSessions)} disabled={!filteredSessions.length}><FileJson size={13} /> JSON</button>
        </div>
      </div>

      {notice && <div className="analytics-notice" role="status"><Check size={14} /> {notice}</div>}

      <section className="metric-grid analytics-metric-grid" aria-label="Session summary">
        <MetricCard label="DATA TRANSFERRED" value={formatBytes(summary.transferredBytes)} detail={`${summary.sessionCount} sessions in this range`} icon={ArrowDownToLine} tone="green" />
        <MetricCard label="TOTAL SESSION TIME" value={formatDuration(summary.elapsedMs)} detail="Combined recorded duration" icon={Clock3} tone="blue" />
        <MetricCard label="AVERAGE SPEED" value={formatSpeed(summary.averageSpeedBps)} detail={`Peak ${formatSpeed(summary.peakSpeedBps)}`} icon={Gauge} tone="violet" />
        <MetricCard label="COMPLETED SESSIONS" value={`${summary.completedCount}`} detail={`${summary.completionRate.toFixed(0)}% completion rate`} icon={Check} tone="amber" />
      </section>

      <div className="analytics-main-grid">
        <section className="dashboard-panel analytics-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">TRANSFER TREND</p><h2>Daily data activity</h2></div>
            <span className="analytics-panel-tag">LAST 14 DAYS</span>
          </div>
          <div className="analytics-chart-summary">
            <strong>{formatBytes(dailyUsage.reduce((sum, item) => sum + item.bytes, 0))}</strong>
            <span><i /> Transferred data</span>
          </div>
          <div className="analytics-bar-chart" role="img" aria-label="Data transferred per day for the last 14 days">
            {dailyUsage.map((day) => (
              <div className="analytics-bar-column" key={day.dateKey} title={`${formatDate(day.date.getTime())}: ${formatBytes(day.bytes)} across ${day.sessions} sessions`}>
                <div className="analytics-bar-column__bar-wrap"><span className={day.bytes > 0 ? 'analytics-bar-column__bar analytics-bar-column__bar--active' : 'analytics-bar-column__bar'} style={{ height: `${day.bytes > 0 ? Math.max(5, (day.bytes / maxDailyBytes) * 100) : 2}%` }} /></div>
                <small>{day.date.getDate()}</small>
              </div>
            ))}
          </div>
          <div className="analytics-chart-axis"><span>{formatDate(dailyUsage[0]?.date.getTime() ?? Date.now())}</span><span>Today</span></div>
          <p className="analytics-footnote">Bars use session start dates. Empty days are shown as zero rather than estimated activity.</p>
        </section>

        <section className="dashboard-panel analytics-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">PERSONAL BESTS</p><h2>Your record board</h2></div>
            <Trophy size={18} className="analytics-panel-icon" />
          </div>
          <div className="analytics-record-list">
            <RecordCard title="BIGGEST SESSION" value={records.biggestSession ? formatBytes(records.biggestSession.transferredBytes) : '—'} detail={records.biggestSession ? formatDate(records.biggestSession.startedAt) : 'No records yet'} icon={Medal} />
            <RecordCard title="FASTEST AVERAGE" value={records.fastestSession ? formatSpeed(records.fastestSession.averageSpeedBps) : '—'} detail={records.fastestSession ? formatDate(records.fastestSession.startedAt) : 'No records yet'} icon={Gauge} />
            <RecordCard title="LONGEST SESSION" value={records.longestSession ? formatDuration(records.longestSession.elapsedMs) : '—'} detail={records.longestSession ? formatDate(records.longestSession.startedAt) : 'No records yet'} icon={Clock3} />
            <RecordCard title="HIGHEST PEAK SPEED" value={records.highestPeakSpeed ? formatSpeed(records.highestPeakSpeed.peakSpeedBps) : '—'} detail={records.highestPeakSpeed ? formatDate(records.highestPeakSpeed.startedAt) : 'No records yet'} icon={TrendingUp} />
          </div>
        </section>
      </div>

      <section className="dashboard-panel analytics-panel analytics-heatmap-panel">
        <div className="dashboard-panel__heading">
          <div><p className="eyebrow">CONSISTENCY MAP</p><h2>Your activity heatmap</h2></div>
          <span className="analytics-panel-tag">12 WEEKS</span>
        </div>
        <p className="dashboard-panel__description">Each square represents one day. Brighter days had more downloaded data; no activity is shown with an empty square.</p>
        <div className="analytics-heatmap-wrap">
          <div className="analytics-heatmap-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
          <div className="analytics-heatmap">
            {heatmap.map((week, weekIndex) => (
              <div className="analytics-heatmap__week" key={`week-${weekIndex}`}>
                {week.map((day) => (
                  <span
                    key={day.dateKey}
                    className={`analytics-heatmap__cell analytics-heatmap__cell--${day.intensity}`}
                    title={`${formatDate(day.date.getTime())}: ${formatBytes(day.bytes)} · ${day.sessions} sessions`}
                    aria-label={`${day.dateKey}, ${formatBytes(day.bytes)}, ${day.sessions} sessions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`analytics-heatmap__cell analytics-heatmap__cell--${level}`} />)}<span>More</span></div>
      </section>

      <section className="analytics-wrapped-grid">
        <article className="analytics-wrapped-card analytics-wrapped-card--month">
          <div className="analytics-wrapped-card__eyebrow"><CalendarDays size={14} /> MONTHLY WRAPPED</div>
          <h2>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now)}</h2>
          <strong>{formatBytes(monthSummary.transferredBytes)}</strong>
          <p>Across {monthSummary.sessionCount} sessions this month</p>
          <div className="analytics-wrapped-card__stats"><span><b>{formatDuration(monthSummary.elapsedMs)}</b><small>TIME SPENT</small></span><span><b>{formatSpeed(monthSummary.peakSpeedBps)}</b><small>PEAK SPEED</small></span></div>
          {topMonthDay.bytes > 0 && <div className="analytics-wrapped-card__highlight"><Zap size={13} /> Biggest day: {formatDate(topMonthDay.date.getTime())} · {formatBytes(topMonthDay.bytes)}</div>}
        </article>
        <article className="analytics-wrapped-card analytics-wrapped-card--year">
          <div className="analytics-wrapped-card__eyebrow"><Award size={14} /> YEARLY WRAPPED</div>
          <h2>{now.getFullYear()} in bytes</h2>
          <strong>{formatBytes(yearSummary.transferredBytes)}</strong>
          <p>Your recorded Data Waster activity this year</p>
          <div className="analytics-wrapped-card__stats"><span><b>{yearSummary.sessionCount}</b><small>SESSIONS</small></span><span><b>{yearSummary.completedCount}</b><small>TARGETS REACHED</small></span></div>
          <div className="analytics-wrapped-card__highlight"><Sparkles size={13} /> Your report updates automatically as new sessions are saved.</div>
        </article>
      </section>

      <section className="dashboard-panel analytics-panel analytics-history-panel">
        <div className="dashboard-panel__heading analytics-history-heading">
          <div><p className="eyebrow">SESSION ARCHIVE</p><h2>Recent download sessions</h2></div>
          <span className="analytics-panel-tag">{displayedSessions.length} RECORDS</span>
        </div>
        <div className="analytics-history-tools">
          <label className="analytics-search"><Search size={14} /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search session ID" aria-label="Search session ID" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | DownloadSessionRecord['status'])} aria-label="Filter sessions by status">
            <option value="all">All statuses</option><option value="completed">Completed</option><option value="stopped">Stopped</option><option value="error">Error</option>
          </select>
          <button type="button" className="button button--danger analytics-clear-button" onClick={handleClearHistory} disabled={!allSessions.length}><Trash2 size={13} /> Clear history</button>
        </div>
        {displayedSessions.length > 0 ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>COMPARE</th><th>SESSION</th><th>DATE</th><th>TRANSFERRED</th><th>DURATION</th><th>AVG SPEED</th><th>STATUS</th><th>DETAILS</th></tr></thead>
              <tbody>
                {displayedSessions.map((session) => (
                  <tr key={session.id}>
                    <td><input className="analytics-compare-check" type="checkbox" checked={selectedIds.includes(session.id)} onChange={() => toggleCompare(session.id)} aria-label={`Select ${session.id} for comparison`} /></td>
                    <td><span className="analytics-session-id">{session.id.slice(0, 8)}</span></td>
                    <td>{formatDateTime(session.startedAt)}</td>
                    <td className="analytics-table__strong">{formatBytes(session.transferredBytes)}</td>
                    <td>{formatDuration(session.elapsedMs)}</td>
                    <td>{formatSpeed(session.averageSpeedBps)}</td>
                    <td><StatusPill tone={statusTone(session.status)}>{session.status.toUpperCase()}</StatusPill></td>
                    <td><button type="button" className="analytics-detail-button" onClick={() => setReplayId(session.id)}><Activity size={13} /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state analytics-empty"><div className="empty-state__icon"><History size={18} /></div><strong>{allSessions.length ? 'No sessions match these filters.' : 'No saved sessions yet.'}</strong><p>{allSessions.length ? 'Try changing the date range, status or search term.' : 'Run a download session from the dashboard. Completed, stopped and failed sessions will appear here.'}</p></div>
        )}
        <div className="analytics-table-footer"><span>Up to 100 recent session records are stored locally by the downloader.</span><span>Select two rows to compare.</span></div>
      </section>

      {selectedSessions.length === 2 && (
        <section className="dashboard-panel analytics-panel">
          <div className="dashboard-panel__heading"><div><p className="eyebrow">SIDE-BY-SIDE REVIEW</p><h2>Compare sessions</h2></div><button type="button" className="analytics-text-button" onClick={() => setSelectedIds([])}>Clear selection</button></div>
          <div className="analytics-compare-grid">
            {selectedSessions.map((session, index) => (
              <article className="analytics-compare-card" key={session.id}>
                <div><span>SESSION {index + 1}</span><strong>{session.id.slice(0, 12)}</strong></div>
                <dl><div><dt>Transferred</dt><dd>{formatBytes(session.transferredBytes)}</dd></div><div><dt>Duration</dt><dd>{formatDuration(session.elapsedMs)}</dd></div><div><dt>Average speed</dt><dd>{formatSpeed(session.averageSpeedBps)}</dd></div><div><dt>Peak speed</dt><dd>{formatSpeed(session.peakSpeedBps)}</dd></div><div><dt>Requests</dt><dd>{session.requestCount}</dd></div></dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {replaySession && (
        <section className="dashboard-panel analytics-panel analytics-replay-panel">
          <div className="dashboard-panel__heading"><div><p className="eyebrow">SESSION REPLAY</p><h2>Session details</h2></div><button type="button" className="analytics-text-button" onClick={() => setReplayId(null)}>Close details</button></div>
          <div className="analytics-replay-heading"><div className="analytics-replay-icon"><Activity size={18} /></div><div><strong>{replaySession.id}</strong><small>{formatDateTime(replaySession.startedAt)} → {formatDateTime(replaySession.finishedAt)}</small></div><StatusPill tone={statusTone(replaySession.status)}>{replaySession.status.toUpperCase()}</StatusPill></div>
          <div className="analytics-replay-grid"><span><small>TRANSFERRED</small><strong>{formatBytes(replaySession.transferredBytes)}</strong></span><span><small>TARGET</small><strong>{formatBytes(replaySession.targetBytes)}</strong></span><span><small>DURATION</small><strong>{formatDuration(replaySession.elapsedMs)}</strong></span><span><small>AVG SPEED</small><strong>{formatSpeed(replaySession.averageSpeedBps)}</strong></span><span><small>PEAK SPEED</small><strong>{formatSpeed(replaySession.peakSpeedBps)}</strong></span><span><small>REQUESTS</small><strong>{replaySession.requestCount}</strong></span></div>
          <div className="analytics-replay-progress"><span style={{ width: `${Math.min(100, replaySession.targetBytes > 0 ? replaySession.transferredBytes / replaySession.targetBytes * 100 : 0)}%` }} /></div>
          <p className="analytics-footnote">This replay is reconstructed from the saved session summary. Per-second samples are not retained in the current session format.</p>
        </section>
      )}

      <div className="analytics-disclaimer"><ShieldAlert size={15} /><p><strong>About these reports:</strong> Analytics use up to the 100 most recent session summaries saved in this browser. Clearing browser storage or using a different browser/device can remove or separate this history. Download totals represent bytes read by the browser, not necessarily your ISP's exact metered usage.</p></div>
    </div>
  );
}

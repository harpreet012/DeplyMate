import { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, AlertCircle, Info, CheckCircle2, X, Filter, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../api.js';
import { relativeTime } from '../utils.js';

const LEVEL_CONFIG = {
  success: { color: '#58d7a3', bg: '#152a24', label: 'Success', icon: CheckCircle2 },
  error: { color: '#f28c9b', bg: '#2a1821', label: 'Error', icon: AlertCircle },
  info: { color: '#72b9f7', bg: '#1b2a3b', label: 'Info', icon: Info },
  warning: { color: '#f4a16e', bg: '#3d2b22', label: 'Warning', icon: AlertCircle },
};

const TYPE_COLORS = {
  deployment: '#a99bff',
  pipeline: '#72b9f7',
  settings: '#f4a16e',
  system: '#58d7a3',
};

function LogEntry({ log }) {
  const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
  const LevelIcon = cfg.icon;
  return (
    <div className="log-entry">
      <div className="log-icon-wrap" style={{ background: cfg.bg }}>
        <LevelIcon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="log-body">
        <div className="log-message">{log.message}</div>
        <div className="log-meta">
          <span className="log-type-badge" style={{ background: TYPE_COLORS[log.type] + '22', color: TYPE_COLORS[log.type] }}>{log.type}</span>
          <span style={{ color: '#65738a' }}>by {log.user}</span>
          <span style={{ color: '#4a566a' }}>·</span>
          <span style={{ color: '#65738a' }}>{relativeTime(log.timestamp)}</span>
        </div>
      </div>
      <span className={`status-pill`} style={{ background: cfg.bg, color: cfg.color, fontSize: 8, flexShrink: 0 }}>
        {cfg.label}
      </span>
    </div>
  );
}

export default function ActivityLogs({ setToast }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 20;

  const fetchLogs = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      setError(null);
      const params = { limit: LIMIT, offset: currentOffset };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (levelFilter !== 'all') params.level = levelFilter;
      const data = await api.activity.list(params);
      if (reset) {
        setLogs(data.logs || []);
        setOffset(LIMIT);
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])]);
        setOffset(currentOffset + LIMIT);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [typeFilter, levelFilter, offset]);

  useEffect(() => {
    fetchLogs(true);
    const t = setInterval(() => fetchLogs(true), 15000);
    return () => clearInterval(t);
  }, [typeFilter, levelFilter]);

  const handleClear = async () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    try {
      await api.activity.clear();
      setLogs([]);
      setTotal(0);
      setToast('Activity logs cleared');
    } catch (e) { setToast(`Error: ${e.message}`); }
  };

  const countByLevel = {
    success: logs.filter(l => l.level === 'success').length,
    error: logs.filter(l => l.level === 'error').length,
    info: logs.filter(l => l.level === 'info').length,
  };

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> AUDIT TRAIL</div>
          <h1>Activity Logs <span className="wave">📋</span></h1>
          <p>Real-time record of all deployments, pipeline runs, and configuration changes.</p>
        </div>
        <div className="heading-actions">
          <button className="button button-secondary" onClick={() => fetchLogs(true)} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="button button-secondary" onClick={handleClear} style={{ color: '#f28c9b', borderColor: '#5a2d3a' }} disabled={logs.length === 0}>
            <Trash2 size={14} /> Clear logs
          </button>
        </div>
      </section>

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total events', value: total, color: '#a99bff' },
          { label: 'Successes', value: countByLevel.success, color: '#58d7a3' },
          { label: 'Errors', value: countByLevel.error, color: '#f28c9b' },
          { label: 'Info events', value: countByLevel.info, color: '#72b9f7' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-top"><span>{label}</span></div>
            <div className="stat-value" style={{ fontSize: 22, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: '#65738a' }} />
        <span style={{ fontSize: 9, color: '#65738a', marginRight: 4 }}>TYPE:</span>
        {['all', 'deployment', 'pipeline', 'settings', 'system'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className="button button-secondary"
            style={{ padding: '5px 10px', fontSize: 9, background: typeFilter === t ? '#242148' : undefined, color: typeFilter === t ? '#bdb3ff' : undefined, borderColor: typeFilter === t ? '#7968e8' : undefined }}>
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
        <span style={{ fontSize: 9, color: '#65738a', marginLeft: 8, marginRight: 4 }}>LEVEL:</span>
        {['all', 'success', 'error', 'info'].map(l => (
          <button key={l} onClick={() => setLevelFilter(l)} className="button button-secondary"
            style={{ padding: '5px 10px', fontSize: 9, background: levelFilter === l ? '#242148' : undefined, color: levelFilter === l ? '#bdb3ff' : undefined, borderColor: levelFilter === l ? '#7968e8' : undefined }}>
            {l === 'all' ? 'All levels' : l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state"><RefreshCw size={24} className="spin" /><p>Loading activity logs…</p></div>
      ) : error ? (
        <div className="error-state"><AlertCircle size={24} /><p>{error}</p><button className="button button-secondary" onClick={() => fetchLogs(true)}>Retry</button></div>
      ) : logs.length === 0 ? (
        <div className="empty-state"><Activity size={36} /><p>No activity logs</p><small>Events will appear here as you use DeployMate</small></div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #202b3d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#c8d2e3' }}>Events</span>
            <span style={{ fontSize: 9, color: '#65738a' }}>Showing {logs.length} of {total}</span>
          </div>
          <div className="log-list">
            {logs.map(log => <LogEntry key={log.id} log={log} />)}
          </div>
          {hasMore && (
            <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid #202b3d' }}>
              <button className="button button-secondary" onClick={() => fetchLogs(false)} disabled={loadingMore}>
                {loadingMore ? <RefreshCw size={14} className="spin" /> : <ChevronDown size={14} />}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

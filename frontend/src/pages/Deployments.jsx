import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Rocket, GitBranch, PackageCheck, AlertCircle, MoreHorizontal, Plus, Trash2, Filter } from 'lucide-react';
import { api } from '../api.js';
import { relativeTime } from '../utils.js';

function NewDeploymentModal({ onClose, onCreated, setToast }) {
  const [form, setForm] = useState({ branch: 'main', environment: 'production', commit: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.commit.trim()) return setToast('Please enter a commit message');
    setSubmitting(true);
    try {
      const dep = await api.deployments.create(form);
      setToast(`Deployment ${dep.id} ${dep.status === 'success' ? 'succeeded' : 'failed'}`);
      onCreated(dep);
      onClose();
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><div className="section-kicker">NEW DEPLOYMENT</div><h2 style={{ margin: '4px 0 0', fontSize: 15 }}>Trigger deployment</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ paddingTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="settings-label">
              Branch
              <input className="settings-input" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="main" />
            </label>
            <label className="settings-label">
              Environment
              <select className="settings-input settings-select" value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="review">Review</option>
              </select>
            </label>
            <label className="settings-label">
              Commit message
              <input className="settings-input" value={form.commit} onChange={e => setForm(f => ({ ...f, commit: e.target.value }))} placeholder="Describe what changed" required />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? <RefreshCw size={14} className="spin" /> : <Rocket size={14} />}
              {submitting ? 'Deploying…' : 'Deploy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeploymentDetailModal({ deployment, onClose, onDelete, setToast }) {
  if (!deployment) return null;
  const handleDelete = async () => {
    try {
      await api.deployments.delete(deployment.id);
      setToast(`Deployment ${deployment.id} deleted`);
      onDelete(deployment.id);
      onClose();
    } catch (e) { setToast(`Error: ${e.message}`); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><div className="section-kicker">DEPLOYMENT DETAILS</div><h2 style={{ margin: '4px 0 0', fontSize: 15 }}>{deployment.id}</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              ['Version', deployment.version],
              ['Status', deployment.status],
              ['Branch', deployment.branch],
              ['Environment', deployment.environment || '—'],
              ['Duration', deployment.duration],
              ['Triggered by', deployment.triggeredBy || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#141f30', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: '#65738a', marginBottom: 4 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: '#dfe5f2', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#141f30', borderRadius: 7, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 8, color: '#65738a', marginBottom: 4 }}>COMMIT</div>
            <div style={{ fontSize: 11, color: '#dfe5f2' }}>{deployment.commit}</div>
          </div>
          {deployment.errorMessage && (
            <div style={{ padding: 12, background: '#2a1821', border: '1px solid #5a2d3a', borderRadius: 7, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <AlertCircle size={14} style={{ color: '#f28c9b', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#f28c9b', marginBottom: 3 }}>Error</div>
                  <div style={{ fontSize: 9, color: '#c48f96' }}>{deployment.errorMessage}</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="button button-secondary" onClick={handleDelete} style={{ color: '#f28c9b', borderColor: '#5a2d3a' }}>
              <Trash2 size={13} /> Delete
            </button>
            <button className="button button-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Deployments({ setToast }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDep, setSelectedDep] = useState(null);
  const [filter, setFilter] = useState('all'); // all | success | failed

  const fetch = async () => {
    try {
      setError(null);
      const data = await api.deployments.list();
      setDeployments(data.deployments || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = filter === 'all' ? deployments : deployments.filter(d => d.status === filter);
  const successCount = deployments.filter(d => d.status === 'success').length;
  const failedCount = deployments.filter(d => d.status === 'failed').length;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> RELEASE MANAGEMENT</div>
          <h1>Deployments <span className="wave">🚀</span></h1>
          <p>View, manage and trigger new deployments across all environments.</p>
        </div>
        <div className="heading-actions">
          <button className="button button-secondary" onClick={fetch} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="button button-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={15} /> New deployment
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total', value: deployments.length, tone: 'purple' },
          { label: 'Successful', value: successCount, tone: 'green' },
          { label: 'Failed', value: failedCount, tone: 'orange' },
          { label: 'Success rate', value: deployments.length ? `${Math.round(successCount / deployments.length * 100)}%` : '—', tone: 'blue' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="stat-card">
            <div className="stat-top"><span>{label}</span></div>
            <div className="stat-value" style={{ fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <Filter size={13} style={{ color: '#65738a' }} />
        {['all', 'success', 'failed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="button button-secondary"
            style={{ padding: '5px 10px', fontSize: 9, background: filter === f ? '#242148' : undefined, color: filter === f ? '#bdb3ff' : undefined, borderColor: filter === f ? '#7968e8' : undefined }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#65738a' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="loading-state"><RefreshCw size={24} className="spin" /><p>Loading deployments…</p></div>
      ) : error ? (
        <div className="error-state"><AlertCircle size={24} /><p>{error}</p><button className="button button-secondary" onClick={fetch}>Retry</button></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><PackageCheck size={36} /><p>No deployments found</p><small>{filter !== 'all' ? 'Try changing the filter' : 'Create your first deployment above'}</small></div>
      ) : (
        <div className="panel deployments-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>DEPLOYMENT</th><th>COMMIT</th><th>BRANCH</th><th>ENV</th><th>STATUS</th><th>DURATION</th><th>TIME</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="deployment-id">
                        <span className="deployment-icon"><PackageCheck size={15} /></span>
                        <span><b>{item.id}</b><small>{item.version}</small></span>
                      </div>
                    </td>
                    <td className="commit-cell" title={item.commit}>{item.commit.length > 36 ? item.commit.slice(0, 36) + '…' : item.commit}</td>
                    <td><span className="branch-tag"><GitBranch size={12} />{item.branch}</span></td>
                    <td><span style={{ fontSize: 8, padding: '3px 7px', borderRadius: 4, background: '#1e2a3d', color: '#8fa3c0' }}>{item.environment || '—'}</span></td>
                    <td>
                      <span className={`status-pill ${item.status === 'success' ? 'status-success' : 'status-failed'}`}>
                        {item.status === 'success' ? <Check size={12} /> : <X size={12} />}
                        {item.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="duration-cell">{item.duration}</td>
                    <td className="time-cell">{relativeTime(item.time)}</td>
                    <td>
                      <button className="icon-button row-more" aria-label={`Options for ${item.id}`} onClick={() => setSelectedDep(item)}>
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-bottom">
            <span>Showing <b>{filtered.length}</b> of {deployments.length} deployments</span>
            <span><i className="legend-dot" /> {successCount} successful <i className="legend-dot failed-dot" /> {failedCount} failed</span>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewDeploymentModal
          onClose={() => setShowNewModal(false)}
          onCreated={(dep) => setDeployments(prev => [dep, ...prev])}
          setToast={setToast}
        />
      )}
      {selectedDep && (
        <DeploymentDetailModal
          deployment={selectedDep}
          onClose={() => setSelectedDep(null)}
          onDelete={(id) => setDeployments(prev => prev.filter(d => d.id !== id))}
          setToast={setToast}
        />
      )}
    </div>
  );
}

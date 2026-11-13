import { useEffect, useState } from 'react';
import { Check, X, RefreshCw, Rocket, GitBranch, Workflow, Github, Code2, ShieldCheck, Box, Clock3, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { api } from '../api.js';
import { relativeTime } from '../utils.js';

const STAGE_ICONS = { Source: Github, Build: Code2, Test: ShieldCheck, Docker: Box, Deploy: Rocket };

function StageNode({ stage }) {
  const Icon = STAGE_ICONS[stage.name] || Workflow;
  const isSuccess = stage.status === 'success';
  const isFailed = stage.status === 'failed';
  const isRunning = stage.status === 'running';
  const isPending = stage.status === 'pending';
  const isSkipped = stage.status === 'skipped';

  return (
    <div className="pipeline-stage">
      <div className={`stage-node ${isFailed ? 'stage-node-failed' : isRunning ? 'stage-node-running' : isPending || isSkipped ? 'stage-node-pending' : ''}`}>
        <Icon size={17} />
        {isSuccess && <span className="node-check"><Check size={9} /></span>}
        {isFailed && <span className="node-fail"><X size={9} /></span>}
        {isRunning && <span className="node-running"><RefreshCw size={9} className="spin" /></span>}
      </div>
      <b>{stage.name}</b>
      <small style={{ color: isSkipped ? '#4a566a' : undefined }}>{stage.time}</small>
      {stage.status === 'failed' && stage.error && (
        <small style={{ color: '#f28c9b', fontSize: '7px', maxWidth: 60, textAlign: 'center' }}>{stage.error}</small>
      )}
    </div>
  );
}

function PipelineCard({ pipeline, onViewDetails }) {
  const passed = pipeline.stages.filter(s => s.status === 'success').length;
  const failed = pipeline.stages.filter(s => s.status === 'failed').length;
  const statusColor = pipeline.status === 'success' ? 'status-success' : pipeline.status === 'failed' ? 'status-failed' : 'status-running';

  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="pipeline-meta">
        <div className="pipeline-name">
          <div className="pipeline-icon"><Workflow size={17} /></div>
          <span>
            <b>{pipeline.name}</b>
            <small><GitBranch size={12} /> {pipeline.branch} <span className="meta-dot">·</span> #{pipeline.runNumber}</small>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`status-pill ${statusColor}`}>
            {pipeline.status === 'success' ? <Check size={12} /> : pipeline.status === 'failed' ? <X size={12} /> : <RefreshCw size={12} className="spin" />}
            {pipeline.status === 'success' ? 'Passed' : pipeline.status === 'failed' ? 'Failed' : 'Running'}
          </span>
          <button className="button button-secondary compact" onClick={() => onViewDetails(pipeline)} style={{ fontSize: 9, padding: '5px 9px' }}>Details</button>
        </div>
      </div>

      <div className="pipeline-track">
        {pipeline.stages.map((stage, i) => (
          <div key={stage.name} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <StageNode stage={stage} />
            {i < pipeline.stages.length - 1 && <div className="stage-connector"><i /></div>}
          </div>
        ))}
      </div>

      <div className="pipeline-footer">
        <span><Clock3 size={14} /> Duration <b>{pipeline.duration}</b></span>
        <span><CheckCircle2 size={14} /> {passed} of {pipeline.stages.length} passed {failed > 0 && <span style={{ color: '#f28c9b' }}>· {failed} failed</span>}</span>
        <span style={{ color: '#65738a', fontSize: 8 }}>{relativeTime(pipeline.createdAt)} · by {pipeline.triggeredBy}</span>
      </div>
    </div>
  );
}

function PipelineDetailModal({ pipeline, onClose }) {
  if (!pipeline) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-kicker">PIPELINE DETAILS</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 15 }}>{pipeline.name} #{pipeline.runNumber}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ padding: '16px 0 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Branch', pipeline.branch],
              ['Status', pipeline.status],
              ['Duration', pipeline.duration],
              ['Triggered by', pipeline.triggeredBy],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#141f30', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: '#65738a', marginBottom: 4 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: '#dfe5f2', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#65738a', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>STAGES</div>
          {pipeline.stages.map(stage => (
            <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #202b3d' }}>
              <span className={`status-pill ${stage.status === 'success' ? 'status-success' : stage.status === 'failed' ? 'status-failed' : 'status-running'}`} style={{ minWidth: 70 }}>
                {stage.status === 'success' ? <Check size={10} /> : stage.status === 'failed' ? <X size={10} /> : stage.status === 'running' ? <RefreshCw size={10} className="spin" /> : <span style={{ width: 10 }} />}
                {stage.status}
              </span>
              <span style={{ flex: 1, fontSize: 10, color: '#c8d2e3' }}>{stage.name} <span style={{ color: '#65738a' }}>— {stage.detail}</span></span>
              <span style={{ fontSize: 9, color: '#7a8898' }}>{stage.time}</span>
            </div>
          ))}
          {pipeline.stages.some(s => s.error) && (
            <div style={{ marginTop: 12, padding: 12, background: '#2a1821', border: '1px solid #5a2d3a', borderRadius: 7 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#f28c9b', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#f28c9b', marginBottom: 4 }}>Failure reason</div>
                  <div style={{ fontSize: 9, color: '#c48f96' }}>{pipeline.stages.find(s => s.error)?.error}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pipelines({ setToast }) {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState(null);

  const fetchPipelines = async () => {
    try {
      setError(null);
      const data = await api.pipelines.list();
      setPipelines(data.pipelines || []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPipelines();
    const t = setInterval(fetchPipelines, 10000);
    return () => clearInterval(t);
  }, []);

  const handleTrigger = async () => {
    if (!branch.trim()) return;
    setTriggering(true);
    try {
      const result = await api.pipelines.trigger({ branch: branch.trim() });
      setToast(`Pipeline #${result.runNumber} triggered on branch "${branch}"`);
      setPipelines(prev => [result, ...prev]);
      setTimeout(fetchPipelines, 9000);
    } catch (e) {
      setToast(`Error: ${e.message}`);
    } finally { setTriggering(false); }
  };

  const passed = pipelines.filter(p => p.status === 'success').length;
  const failed = pipelines.filter(p => p.status === 'failed').length;
  const running = pipelines.filter(p => p.status === 'running').length;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> CI/CD AUTOMATION</div>
          <h1>Pipelines <span className="wave">⚡</span></h1>
          <p>Monitor and trigger your CI/CD pipeline runs.</p>
        </div>
        <div className="heading-actions">
          <button className="button button-secondary" onClick={fetchPipelines} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total runs', value: pipelines.length, tone: 'purple', icon: Workflow },
          { label: 'Passed', value: passed, tone: 'green', icon: CheckCircle2 },
          { label: 'Failed', value: failed, tone: 'orange', icon: X },
          { label: 'Running', value: running, tone: 'blue', icon: RefreshCw },
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17} /></span></div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Trigger panel */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-heading">
          <div><div className="section-kicker">MANUAL TRIGGER</div><h2>Run a pipeline</h2><p>Trigger a new CI/CD run on any branch</p></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141f30', border: '1px solid #263147', borderRadius: 7, padding: '0 12px', flex: '1 1 180px', minWidth: 160 }}>
            <GitBranch size={14} style={{ color: '#7a89a5', flexShrink: 0 }} />
            <input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="Branch name"
              className="settings-input"
              style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', outline: 'none', color: '#e4eaff', fontSize: 11 }}
            />
          </div>
          <button className="button button-primary" onClick={handleTrigger} disabled={triggering || !branch.trim()}>
            {triggering ? <RefreshCw size={15} className="spin" /> : <Play size={15} fill="currentColor" />}
            {triggering ? 'Triggering…' : 'Trigger pipeline'}
          </button>
        </div>
      </div>

      {/* Pipeline list */}
      {loading ? (
        <div className="loading-state"><RefreshCw size={24} className="spin" /><p>Loading pipelines…</p></div>
      ) : error ? (
        <div className="error-state"><AlertCircle size={24} /><p>{error}</p><button className="button button-secondary" onClick={fetchPipelines}>Retry</button></div>
      ) : pipelines.length === 0 ? (
        <div className="empty-state"><Workflow size={36} /><p>No pipeline runs yet</p><small>Trigger your first pipeline run above</small></div>
      ) : (
        pipelines.map(p => (
          <PipelineCard key={p.id} pipeline={p} onViewDetails={setSelectedPipeline} />
        ))
      )}

      <PipelineDetailModal pipeline={selectedPipeline} onClose={() => setSelectedPipeline(null)} />
    </div>
  );
}

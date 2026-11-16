import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  RefreshCw,
  GitBranch,
  Workflow,
  Github,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Play,
  ExternalLink,
  Search,
  Copy,
  Download,
  FileText,
} from 'lucide-react';

import { api } from '../api.js';
import { relativeTime } from '../utils.js';

function normalizeRun(run) {
  let status = 'queued';

  if (run.status === 'completed') {
    status =
      run.conclusion === 'success'
        ? 'success'
        : run.conclusion === 'cancelled'
          ? 'cancelled'
          : run.conclusion === 'skipped'
            ? 'skipped'
            : 'failed';
  } else if (run.status === 'in_progress') {
    status = 'running';
  }

  return { ...run, status };
}

function analyzeFailure(logFiles, jobs = []) {
  const allLines = logFiles.flatMap((file) =>
    (file.content || '')
      .split(/\r?\n/)
      .map((line) => ({ line: line.trim(), file: file.name }))
      .filter((entry) => entry.line)
  );

  const patterns = [
    {
      category: 'Dependency Error',
      test: /npm ERR!|ERESOLVE|unable to resolve dependency|module not found|cannot find package|no matching version/i,
      cause: 'A required package or dependency could not be resolved or loaded.',
      fix: 'Check package.json and package-lock.json, verify package versions, then run npm install and retry the build.',
    },
    {
      category: 'Test Failure',
      test: /AssertionError|tests? failed|test suite failed|FAIL\s|failing tests?|expected .* to (equal|be)|not ok \d+/i,
      cause: 'One or more automated tests did not pass.',
      fix: 'Inspect the failed test output, correct the application logic or test expectation, and rerun the test suite.',
    },
    {
      category: 'Docker Build Error',
      test: /docker build failed|failed to solve|failed to compute cache key|dockerfile parse error|error response from daemon|no such file or directory.*docker/i,
      cause: 'Docker could not complete an image build or resolve a required build input.',
      fix: 'Review the Dockerfile, build context, COPY paths, base image and Docker build output.',
    },
    {
      category: 'Authentication / Permission Error',
      test: /authentication failed|bad credentials|unauthorized|permission denied|resource not accessible by integration|403 forbidden|401 unauthorized/i,
      cause: 'A credential, token, or permission required by the workflow may be missing or insufficient.',
      fix: 'Verify the relevant GitHub Actions secrets, token permissions and repository access. Never print tokens in logs.',
    },
    {
      category: 'Build / Compilation Error',
      test: /build failed|compilation failed|failed to compile|syntaxerror|typeerror|vite.*error|error during build/i,
      cause: 'The application build or compilation step reported an error.',
      fix: 'Open the first meaningful compiler error, fix the referenced file or configuration, and rerun the build.',
    },
    {
      category: 'Network / Registry Error',
      test: /ETIMEDOUT|ECONNRESET|ENOTFOUND|network is unreachable|connection timed out|failed to fetch.*image|toomanyrequests/i,
      cause: 'A network connection or external package/container registry request failed.',
      fix: 'Check network availability, registry status, image or package names, and rate limits. Retry after confirming the service is reachable.',
    },
  ];

  const failedJob = jobs.find(
    (job) => job.conclusion === 'failure' || job.conclusion === 'failed'
  );

  const match = patterns
    .map((pattern) => ({
      ...pattern,
      evidence: allLines.find((entry) => pattern.test.test(entry.line)),
    }))
    .find((pattern) => pattern.evidence);

  if (!match) {
    return {
      category: 'Unclassified Failure',
      cause: failedJob
        ? `The job "${failedJob.name}" failed, but no known error signature was found in the downloaded logs.`
        : 'The workflow failed, but the available logs did not contain a recognizable error signature.',
      fix: 'Open the failed job on GitHub, inspect its failed step and review the surrounding log lines for the first underlying error.',
      evidence: null,
      job: failedJob?.name || null,
      confidence: 'Limited',
    };
  }

  return {
    category: match.category,
    cause: match.cause,
    fix: match.fix,
    evidence: match.evidence,
    job: failedJob?.name || null,
    confidence: 'Pattern match',
  };
}

function StatusBadge({ status }) {
  const config = {
    success: { label: 'Success', className: 'status-success', icon: Check },
    failed: { label: 'Failed', className: 'status-failed', icon: X },
    cancelled: { label: 'Cancelled', className: 'status-failed', icon: X },
    skipped: { label: 'Skipped', className: 'status-running', icon: Check },
    running: { label: 'Running', className: 'status-running', icon: RefreshCw },
    queued: { label: 'Queued', className: 'status-running', icon: Clock3 },
  };

  const item = config[status] || config.queued;
  const Icon = item.icon;

  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={12} className={status === 'running' ? 'spin' : ''} />
      {item.label}
    </span>
  );
}

function PipelineCard({ pipeline, onViewDetails }) {
  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="pipeline-meta">
        <div className="pipeline-name">
          <div className="pipeline-icon">
            <Workflow size={17} />
          </div>

          <span>
            <b>{pipeline.name}</b>
            <small>
              <GitBranch size={12} /> {pipeline.branch}
              <span className="meta-dot"> · </span>
              #{pipeline.runNumber}
            </small>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={pipeline.status} />

          <button
            className="button button-secondary compact"
            onClick={() => onViewDetails(pipeline)}
            style={{ fontSize: 9, padding: '5px 9px' }}
          >
            Details
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 15,
          padding: '16px 0',
          fontSize: 10,
          color: '#9aa8bd',
        }}
      >
        <span>
          <Github size={13} /> {pipeline.triggeredBy || 'Unknown'}
        </span>

        <span>
          <Clock3 size={13} /> {pipeline.duration || 'In progress'}
        </span>

        <span>Event: {pipeline.event || '—'}</span>
      </div>

      <div className="pipeline-footer">
        <span>
          <CheckCircle2 size={14} /> Run #{pipeline.runNumber}
        </span>

        <span>
          <GitBranch size={14} /> {pipeline.branch}
        </span>

        <span style={{ color: '#65738a', fontSize: 8 }}>
          {pipeline.createdAt ? relativeTime(pipeline.createdAt) : 'Recently'}
        </span>
      </div>

      {pipeline.url && (
        <div style={{ marginTop: 12 }}>
          <a
            href={pipeline.url}
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#8b9dff',
              fontSize: 10,
              textDecoration: 'none',
            }}
          >
            View on GitHub <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

function PipelineDetailModal({ pipeline, onClose }) {
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logsError, setLogsError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('parsed');
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        setLoading(true);
        setError('');

        const result = await api.github.jobs(pipeline.id);

        if (active) setJobs(result.jobs || []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, [pipeline.id]);

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError('');

      const result = await api.github.logs(pipeline.id);

      setLogs(result.files || []);
      setSelectedLog(0);
      setSearch('');
    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleAnalyzeFailure = async () => {
    try {
      setAnalysisLoading(true);
      setAnalysisError('');
      setAnalysis(null);

      // Reuse already downloaded logs; fetch only when necessary.
      let availableLogs = logs;

      if (!availableLogs.length) {
        const result = await api.github.logs(pipeline.id);
        availableLogs = result.files || [];
        setLogs(availableLogs);
        setSelectedLog(0);
      }

      if (!availableLogs.length) {
        throw new Error('No log files are available for this workflow run.');
      }

      const report = analyzeFailure(availableLogs, jobs);
      setAnalysis(report);
    } catch (err) {
      setAnalysisError(err.message || 'Could not analyze workflow logs.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const currentLog = logs[selectedLog];
  const lines = (currentLog?.content || '').split(/\r?\n/);

  const filteredLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      line.toLowerCase().includes(search.toLowerCase())
    );

  const copyLogs = async () => {
    if (!currentLog) return;

    try {
      await navigator.clipboard.writeText(currentLog.content);
    } catch {
      setLogsError('Could not copy logs. Check browser clipboard permissions.');
    }
  };

  const downloadLogs = () => {
    if (!currentLog) return;

    const blob = new Blob([currentLog.content], {
      type: 'text/plain;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = currentLog.name.split('/').pop() || 'workflow-log.txt';
    link.click();

    URL.revokeObjectURL(url);
  };

  const getLineClass = (line) => {
    if (/\b(error|failed|failure|fatal)\b/i.test(line)) {
      return '#fb7185';
    }

    if (/\b(warning|warn)\b/i.test(line)) {
      return '#fbbf24';
    }

    if (/\b(success|passed|completed successfully)\b/i.test(line)) {
      return '#4ade80';
    }

    return '#aab7cc';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 850, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div>
            <div className="section-kicker">GITHUB ACTIONS DETAILS</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 15 }}>
              {pipeline.name} #{pipeline.runNumber}
            </h2>
          </div>

          <button className="icon-button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {/* Run metadata */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            paddingTop: 16,
            marginBottom: 20,
          }}
        >
          {[
            ['Branch', pipeline.branch],
            ['Status', pipeline.status],
            ['Duration', pipeline.duration],
            ['Triggered by', pipeline.triggeredBy],
            ['Event', pipeline.event],
            ['Commit', pipeline.commit?.slice(0, 7)],
          ].map(([key, value]) => (
            <div
              key={key}
              style={{
                background: '#141f30',
                borderRadius: 7,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: '#65738a',
                  marginBottom: 4,
                }}
              >
                {key.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#dfe5f2',
                  fontWeight: 600,
                }}
              >
                {value || '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Actual GitHub jobs */}
        <div className="section-kicker" style={{ marginBottom: 12 }}>
          ACTUAL GITHUB JOBS
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={20} className="spin" />
            <p>Loading GitHub jobs...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <Workflow size={25} />
            <p>No jobs available for this run.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const jobStatus =
              job.status === 'completed'
                ? job.conclusion === 'success'
                  ? 'success'
                  : job.conclusion === 'cancelled'
                    ? 'cancelled'
                    : job.conclusion === 'skipped'
                      ? 'skipped'
                      : 'failed'
                : job.status === 'in_progress'
                  ? 'running'
                  : 'queued';

            return (
              <div
                key={job.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 0',
                  borderBottom: '1px solid #202b3d',
                }}
              >
                <StatusBadge status={jobStatus} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 10,
                    color: '#c8d2e3',
                  }}
                >
                  {job.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: '#7a8898',
                  }}
                >
                  {job.steps?.length || 0} steps
                </span>
              </div>
            );
          })
        )}

        {/* Intelligent Failure Analysis */}
        {pipeline.status === 'failed' && (
          <div className="panel" style={{ marginTop: 24, padding: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="section-kicker">INTELLIGENT FAILURE ANALYSIS</div>
                <h3 style={{ fontSize: 14, margin: '5px 0' }}>
                  Root Cause Detection
                </h3>
                <p style={{ fontSize: 10, color: '#9aa8bd', margin: 0 }}>
                  Analyze actual GitHub Actions execution logs.
                </p>
              </div>

              <button
                className="button button-primary compact"
                onClick={handleAnalyzeFailure}
                disabled={analysisLoading}
              >
                <RefreshCw
                  size={13}
                  className={analysisLoading ? 'spin' : ''}
                />
                {analysisLoading
                  ? 'Analyzing...'
                  : analysis
                    ? 'Analyze again'
                    : 'Analyze failure'}
              </button>
            </div>

            {analysisError && (
              <div className="error-state" style={{ marginTop: 14 }}>
                <AlertCircle size={16} />
                <p>{analysisError}</p>
              </div>
            )}

            {analysis && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '5px 9px',
                    borderRadius: 6,
                    background: '#3b1d2b',
                    color: '#fb7185',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {analysis.category}
                </div>

                {analysis.job && (
                  <div style={{ marginTop: 12, fontSize: 10, color: '#9aa8bd' }}>
                    <strong>Failed job:</strong> {analysis.job}
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <div className="section-kicker">ROOT CAUSE</div>
                  <p style={{ fontSize: 11, color: '#dfe5f2', lineHeight: 1.7 }}>
                    {analysis.cause}
                  </p>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="section-kicker">SUGGESTED FIX</div>
                  <p style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.7 }}>
                    {analysis.fix}
                  </p>
                </div>

                {analysis.evidence && (
                  <div style={{ marginTop: 14 }}>
                    <div className="section-kicker">MATCHED LOG EVIDENCE</div>
                    <div
                      style={{
                        marginTop: 7,
                        padding: 10,
                        background: '#0b1220',
                        border: '1px solid #263147',
                        borderRadius: 6,
                        fontFamily: 'Consolas, monospace',
                        fontSize: 10,
                        color: '#fb7185',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {analysis.evidence.line}
                    </div>
                    <p style={{ fontSize: 9, color: '#718096', marginTop: 6 }}>
                      Source: {analysis.evidence.file}
                    </p>
                  </div>
                )}

                <p style={{ fontSize: 9, color: '#718096', marginTop: 12 }}>
                  Analysis confidence: {analysis.confidence}. This is a
                  rule-based diagnostic, not a guaranteed root-cause
                  determination.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logs section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 25,
            marginBottom: 12,
          }}
        >
          <div>
            <div className="section-kicker">EXECUTION LOGS</div>
            <h3 style={{ fontSize: 13, margin: '5px 0 0' }}>
              Workflow console output
            </h3>
          </div>

          <button
            className="button button-secondary compact"
            onClick={loadLogs}
            disabled={logsLoading}
          >
            <RefreshCw size={13} className={logsLoading ? 'spin' : ''} />
            {logsLoading ? 'Loading...' : logs.length ? 'Reload logs' : 'Load logs'}
          </button>
        </div>

        {logsError && (
          <div className="error-state">
            <AlertCircle size={16} />
            <p>{logsError}</p>
          </div>
        )}

        {logsLoading ? (
          <div className="loading-state">
            <RefreshCw size={20} className="spin" />
            <p>Fetching workflow logs...</p>
          </div>
        ) : logs.length > 0 ? (
          <div
            style={{
              border: '1px solid #263147',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#0b1220',
            }}
          >
            {/* Log file selector */}
            <div
              style={{
                padding: 10,
                borderBottom: '1px solid #263147',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <select
                value={selectedLog}
                onChange={(e) => setSelectedLog(Number(e.target.value))}
                style={{
                  flex: '1 1 200px',
                  minWidth: 0,
                  background: '#141f30',
                  color: '#dfe5f2',
                  border: '1px solid #263147',
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 10,
                }}
              >
                {logs.map((log, index) => (
                  <option key={log.name} value={index}>
                    {log.name}
                  </option>
                ))}
              </select>

              <button
                className="button button-secondary compact"
                onClick={copyLogs}
                disabled={!currentLog}
              >
                <Copy size={12} /> Copy
              </button>

              <button
                className="button button-secondary compact"
                onClick={downloadLogs}
                disabled={!currentLog}
              >
                <Download size={12} /> Download
              </button>
            </div>

            {/* Search and view mode */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 10,
                borderBottom: '1px solid #263147',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  flex: '1 1 180px',
                  background: '#141f30',
                  border: '1px solid #263147',
                  borderRadius: 6,
                  padding: '0 9px',
                }}
              >
                <Search size={13} color="#7a8898" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: '#dfe5f2',
                    border: 'none',
                    outline: 'none',
                    padding: '9px 0',
                    fontSize: 10,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 5 }}>
                {['parsed', 'raw'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`button compact ${
                      viewMode === mode ? 'button-primary' : 'button-secondary'
                    }`}
                  >
                    {mode === 'parsed' ? 'Parsed' : 'Raw'}
                  </button>
                ))}
              </div>
            </div>

            {/* Log content */}
            <div
              style={{
                maxHeight: 340,
                overflow: 'auto',
                padding: 12,
                fontFamily: 'Consolas, monospace',
                fontSize: 10,
                lineHeight: 1.7,
              }}
            >
              {viewMode === 'raw' ? (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    color: '#aab7cc',
                  }}
                >
                  {currentLog?.content || ''}
                </pre>
              ) : filteredLines.length > 0 ? (
                filteredLines.map(({ line, index }) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 12,
                      color: getLineClass(line),
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      borderBottom: '1px solid #ffffff08',
                    }}
                  >
                    <span
                      style={{
                        minWidth: 35,
                        color: '#53627a',
                        textAlign: 'right',
                        userSelect: 'none',
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{line || ' '}</span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: '#7a8898',
                    padding: 15,
                    textAlign: 'center',
                  }}
                >
                  No matching log lines found.
                </div>
              )}
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #263147',
                color: '#718096',
                fontSize: 9,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span>{logs.length} log files</span>
              <span>
                {filteredLines.length} / {lines.length} lines
              </span>
            </div>
          </div>
        ) : (
          !logsLoading &&
          !logsError && (
            <div className="empty-state">
              <FileText size={25} />
              <p>Click Load logs to view actual GitHub execution logs.</p>
            </div>
          )
        )}

        {pipeline.url && (
          <div style={{ marginTop: 18 }}>
            <a
              href={pipeline.url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#8b9dff',
                fontSize: 11,
                textDecoration: 'none',
              }}
            >
              Open complete workflow on GitHub <ExternalLink size={12} />
            </a>
          </div>
        )}
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
  const [githubConnected, setGithubConnected] = useState(false);
  const [workflowName, setWorkflowName] = useState('DeployMate CI/CD');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestInFlight = useRef(false);

  const fetchPipelines = useCallback(async () => {
    // Prevent overlapping API requests
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setRefreshing(true);

    try {
      const [statusResult, runsResult] = await Promise.all([
        api.github.status(),
        api.github.runs({ per_page: 30 }),
      ]);

      setGithubConnected(statusResult.connected === true);
      setPipelines((runsResult.runs || []).map(normalizeRun));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      // Keep previously loaded pipeline data on temporary API errors
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const result = await api.github.workflows();

        if (active && result.workflows?.length) {
          setWorkflowName(result.workflows[0].name);
        }
      } catch (err) {
        console.error('Workflow lookup failed:', err.message);
      }

      if (active) {
        await fetchPipelines();
      }
    }

    initialize();

    // Poll every 10 seconds, only while the tab is visible
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPipelines();
      }
    }, 10000);

    // Refresh immediately when the user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPipelines();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPipelines]);

  const handleTrigger = async () => {
    if (!branch.trim() || !githubConnected) return;

    setTriggering(true);

    try {
      const result = await api.github.dispatch({
        branch: branch.trim(),
      });

      setToast(
        result.message || 'GitHub Actions workflow dispatch requested.'
      );

      // GitHub takes a few seconds to register a dispatched run
      setTimeout(fetchPipelines, 5000);
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const passed = pipelines.filter((p) => p.status === 'success').length;
  const failed = pipelines.filter((p) => p.status === 'failed').length;
  const running = pipelines.filter((p) => p.status === 'running').length;
  const cancelled = pipelines.filter((p) => p.status === 'cancelled').length;
  const skipped = pipelines.filter((p) => p.status === 'skipped').length;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            CI/CD AUTOMATION
          </div>

          <h1>
            Pipelines <span className="wave">⚡</span>
          </h1>

          <p>Live GitHub Actions workflow monitoring.</p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 10,
              fontSize: 10,
              color: githubConnected ? '#4ade80' : '#f28c9b',
            }}
          >
            <Github size={14} />
            {githubConnected
              ? 'Connected to GitHub'
              : 'GitHub connection unavailable'}
          </div>

          {/* Last Updated indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 7,
              fontSize: 9,
              color: '#7a8898',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: refreshing
                  ? '#60a5fa'
                  : lastUpdated
                    ? '#4ade80'
                    : '#7a8898',
              }}
            />
            {refreshing
              ? 'Updating pipeline status…'
              : lastUpdated
                ? `Last updated at ${lastUpdated.toLocaleTimeString()}`
                : 'Waiting for first update…'}
            <span>· Auto-refresh every 10 seconds</span>
          </div>
        </div>

        <div className="heading-actions">
          <button
            className="button button-secondary"
            onClick={fetchPipelines}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {[
          {
            label: 'Total runs',
            value: pipelines.length,
            tone: 'purple',
            icon: Workflow,
          },
          {
            label: 'Passed',
            value: passed,
            tone: 'green',
            icon: CheckCircle2,
          },
          {
            label: 'Failed',
            value: failed,
            tone: 'orange',
            icon: X,
          },
          {
            label: 'Running',
            value: running,
            tone: 'blue',
            icon: RefreshCw,
          },
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {(cancelled > 0 || skipped > 0) && (
        <div
          style={{
            fontSize: 10,
            color: '#9aa8bd',
            marginBottom: 14,
          }}
        >
          {cancelled > 0 && `${cancelled} cancelled`}
          {cancelled > 0 && skipped > 0 && ' · '}
          {skipped > 0 && `${skipped} skipped`}
        </div>
      )}

      {/* Trigger panel */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-heading">
          <div>
            <div className="section-kicker">GITHUB WORKFLOW DISPATCH</div>
            <h2>Run a pipeline</h2>
            <p>Trigger {workflowName} on a branch.</p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#141f30',
              border: '1px solid #263147',
              borderRadius: 7,
              padding: '0 12px',
              flex: '1 1 180px',
              minWidth: 160,
            }}
          >
            <GitBranch size={14} style={{ color: '#7a89a5' }} />

            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch name"
              className="settings-input"
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: '#e4eaff',
                fontSize: 11,
              }}
            />
          </div>

          <button
            className="button button-primary"
            onClick={handleTrigger}
            disabled={triggering || !branch.trim() || !githubConnected}
          >
            {triggering ? (
              <RefreshCw size={15} className="spin" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}

            {triggering ? 'Triggering…' : 'Trigger GitHub workflow'}
          </button>
        </div>
      </div>

      {/* Pipeline list */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={24} className="spin" />
          <p>Loading GitHub Actions runs…</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button className="button button-secondary" onClick={fetchPipelines}>
            Retry
          </button>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="empty-state">
          <Workflow size={36} />
          <p>No GitHub workflow runs yet</p>
        </div>
      ) : (
        <>
          <div className="section-kicker" style={{ marginBottom: 12 }}>
            LIVE GITHUB WORKFLOW HISTORY
          </div>

          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onViewDetails={setSelectedPipeline}
            />
          ))}
        </>
      )}

      {selectedPipeline && (
        <PipelineDetailModal
          pipeline={selectedPipeline}
          onClose={() => setSelectedPipeline(null)}
        />
      )}
    </div>
  );
}
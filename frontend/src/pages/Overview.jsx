import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  Rocket,
  Server,
  Workflow,
  Check,
  X,
  GitBranch,
  PackageCheck,
  MoreHorizontal,
  Github,
  Box,
  Code2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api.js';
import { relativeTime } from '../utils.js';

const STAGES_ICONS = {
  Source: Github,
  Build: Code2,
  Test: ShieldCheck,
  Docker: Box,
  Deploy: Rocket,
};

function StatCard({ label, value, change, icon: Icon, tone, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-change">
        {trend === 'up' ? (
          <span style={{ color: '#48c996', fontSize: 11 }}>↑</span>
        ) : (
          <span style={{ color: '#f28c9b', fontSize: 11 }}>↓</span>
        )}
        <span>{change}</span>
      </div>
    </div>
  );
}

function ServiceRow({ name, detail, status, offline = false }) {
  return (
    <div className="service-row">
      <span className={`service-indicator ${offline ? 'offline' : ''}`} />
      <span className="service-name">
        <b>{name}</b>
        <small>{detail}</small>
      </span>
      <span className={`service-status ${offline ? 'offline-text' : ''}`}>
        {status}
      </span>
    </div>
  );
}

export default function Overview({ setToast }) {
  const [health, setHealth] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [pipeline, setPipeline] = useState(null);
  const [githubRuns, setGithubRuns] = useState([]);
  const [triggering, setTriggering] = useState(false);

  const refresh = async () => {
    setLoading(true);

    const [healthResult, deploymentResult, metricsResult, githubResult] =
      await Promise.allSettled([
        api.health(),
        api.deployments.list({ limit: 4 }),
        api.metrics(),
        api.github.runs({ per_page: 30 }),
      ]);

    if (healthResult.status === 'fulfilled') {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
    }

    if (deploymentResult.status === 'fulfilled') {
      setDeployments(deploymentResult.value.deployments || []);
    }

    if (metricsResult.status === 'fulfilled') {
      setMetrics(metricsResult.value);
    }

    if (githubResult.status === 'fulfilled') {
      const runs = githubResult.value.runs || [];
      setGithubRuns(runs);

      const latestRun = runs[0];

      if (latestRun) {
        try {
          const jobsResult = await api.github.jobs(latestRun.id);

          const stages = (jobsResult.jobs || []).map((job) => {
            const status =
              job.status === 'completed'
                ? job.conclusion === 'success'
                  ? 'success'
                  : job.conclusion === 'skipped'
                    ? 'skipped'
                    : job.conclusion === 'cancelled'
                      ? 'cancelled'
                      : 'failed'
                : job.status === 'in_progress'
                  ? 'running'
                  : 'pending';

            const duration =
              job.startedAt && job.completedAt
                ? `${Math.max(
                    0,
                    Math.round(
                      (new Date(job.completedAt) - new Date(job.startedAt)) /
                        1000
                    )
                  )}s`
                : status === 'running'
                  ? 'Running'
                  : '—';

            return {
              name: job.name,
              status,
              time: duration,
            };
          });

          setPipeline({
            ...latestRun,
            stages,
          });
        } catch {
          setPipeline({ ...latestRun, stages: [] });
        }
      } else {
        setPipeline(null);
      }
    } else {
      setGithubRuns([]);
      setPipeline(null);
      setToast('GitHub API unavailable — check backend configuration');
    }

    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleTriggerPipeline = async () => {
    setTriggering(true);

    try {
      const result = await api.github.dispatch({
        branch: 'main',
      });

      setToast(
        result.message || 'GitHub Actions workflow triggered successfully'
      );

      setTimeout(refresh, 5000);
    } catch (e) {
      setToast(`Failed to trigger pipeline: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const successful = useMemo(
    () => deployments.filter((d) => d.status === 'success').length,
    [deployments]
  );
  const apiState = health ? 'Operational' : 'Connecting';

  const stages = pipeline?.stages || [];
  const stageIcons = stages.map((s) => STAGES_ICONS[s.name] || Workflow);

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> DEPLOYMENT CONTROL CENTER
          </div>
          <h1>
            Good{' '}
            {new Date().getHours() < 12
              ? 'morning'
              : new Date().getHours() < 18
                ? 'afternoon'
                : 'evening'}
            , Admin <span className="wave">✦</span>
          </h1>
          <p>Here's what's happening with your applications today.</p>
        </div>
        <div className="heading-actions">
          <span className="updated-label">
            Updated{' '}
            {lastUpdated.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <button
            className="button button-secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            className="button button-primary"
            onClick={handleTriggerPipeline}
            disabled={triggering}
          >
            {triggering ? (
              <RefreshCw size={15} className="spin" />
            ) : (
              <Rocket size={15} />
            )}
            {triggering ? 'Triggering…' : 'Run pipeline'}
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Deployment metrics">
        <StatCard
          label="Total workflow runs"
          value={githubRuns.length}
          change="Latest 30 GitHub runs"
          icon={Workflow}
          tone="purple"
          trend="up"
        />
        <StatCard
          label="Successful runs"
          value={githubRuns.filter(
            (r) => r.status === 'completed' && r.conclusion === 'success'
          ).length}
          change="GitHub Actions"
          icon={CheckCircle2}
          tone="green"
          trend="up"
        />
        <StatCard
          label="Failed runs"
          value={
            githubRuns.filter(
              (r) =>
                r.status === 'completed' && r.conclusion === 'failure'
            ).length +
            deployments.filter((d) => d.status === 'failed').length
          }
          change="Requires attention"
          icon={CircleAlert}
          tone="orange"
          trend="down"
        />
        <StatCard
          label="Running runs"
          value={githubRuns.filter(
            (r) => r.status === 'in_progress' || r.status === 'queued'
          ).length}
          change="Queued + In progress"
          icon={RefreshCw}
          tone="blue"
          trend="up"
        />
      </section>

      <section className="content-grid">
        {/* Latest Pipeline */}
        <div className="panel pipeline-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">AUTOMATION</div>
              <h2>Latest pipeline</h2>
              <p>Your most recent CI/CD execution</p>
            </div>
          </div>
          {pipeline ? (
            <>
              <div className="pipeline-meta">
                <div className="pipeline-name">
                  <div className="pipeline-icon">
                    <Workflow size={17} />
                  </div>
                  <span>
                    <b>{pipeline.workflowName || pipeline.name}</b>
                    <small>
                      <GitBranch size={12} /> {pipeline.branch}{' '}
                      <span className="meta-dot">·</span> #{pipeline.runNumber}
                    </small>
                  </span>
                </div>
                <span
                  className={`status-pill ${
                    pipeline.status === 'success' ||
                    (pipeline.status === 'completed' &&
                      pipeline.conclusion === 'success')
                      ? 'status-success'
                      : pipeline.status === 'failed' ||
                          (pipeline.status === 'completed' &&
                            pipeline.conclusion !== 'success')
                        ? 'status-failed'
                        : 'status-running'
                  }`}
                >
                  {pipeline.status === 'success' ||
                  (pipeline.status === 'completed' &&
                    pipeline.conclusion === 'success') ? (
                    <Check size={12} />
                  ) : pipeline.status === 'failed' ||
                    (pipeline.status === 'completed' &&
                      pipeline.conclusion !== 'success') ? (
                    <X size={12} />
                  ) : (
                    <RefreshCw size={12} className="spin" />
                  )}
                  {pipeline.status === 'success' ||
                  (pipeline.status === 'completed' &&
                    pipeline.conclusion === 'success')
                    ? 'Passed'
                    : pipeline.status === 'failed' ||
                        (pipeline.status === 'completed' &&
                          pipeline.conclusion !== 'success')
                      ? 'Failed'
                      : 'Running'}
                </span>
              </div>
              <div className="pipeline-track">
                {stages.map((stage, index) => {
                  const SIcon = stageIcons[index] || Workflow;
                  const isSuccess = stage.status === 'success';
                  const isFailed = stage.status === 'failed';
                  const isRunning = stage.status === 'running';
                  return (
                    <div className="pipeline-stage" key={stage.name}>
                      <div
                        className={`stage-node ${
                          isFailed
                            ? 'stage-node-failed'
                            : isRunning
                              ? 'stage-node-running'
                              : !isSuccess
                                ? 'stage-node-pending'
                                : ''
                        }`}
                      >
                        <SIcon size={17} />
                        {isSuccess && (
                          <span className="node-check">
                            <Check size={9} />
                          </span>
                        )}
                        {isFailed && (
                          <span className="node-fail">
                            <X size={9} />
                          </span>
                        )}
                        {isRunning && (
                          <span className="node-running">
                            <RefreshCw size={9} className="spin" />
                          </span>
                        )}
                      </div>
                      <b>{stage.name}</b>
                      <small>{stage.time}</small>
                      {index < stages.length - 1 && (
                        <div className="stage-connector">
                          <i />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pipeline-footer">
                <span>
                  <Clock3 size={14} /> Total duration <b>{pipeline.duration}</b>
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  {stages.filter((s) => s.status === 'success').length} of{' '}
                  {stages.length} stages passed
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Workflow size={28} />
              <p>No pipeline runs yet</p>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="panel health-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">LIVE STATUS</div>
              <h2>System health</h2>
              <p>Service availability overview</p>
            </div>
            <button
              className="icon-button"
              onClick={refresh}
              aria-label="Refresh health"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="health-overview">
            <div className="health-ring">
              <div>
                <CheckCircle2 size={25} />
                <b>{health ? '100%' : '—'}</b>
                <small>HEALTHY</small>
              </div>
            </div>
            <div className="health-copy">
              <span className="health-live">
                <i />{' '}
                {health ? 'All systems operational' : 'Backend not connected'}
              </span>
              <p>
                {health
                  ? `API is responding normally. Uptime: ${Math.floor(
                      (health.uptimeSeconds || 0) / 60
                    )}m`
                  : 'Start the backend to enable live health checks.'}
              </p>
              <small>
                Last checked:{' '}
                {lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            </div>
          </div>
          <div className="service-list">
            <ServiceRow
              name="Frontend"
              detail="Vite + React"
              status="Online"
            />
            <ServiceRow
              name="Backend API"
              detail="Express.js :5000"
              status={health ? 'Online' : 'Offline'}
              offline={!health}
            />
            <ServiceRow
              name="Build Pipeline"
              detail="CI/CD Automation"
              status={
                pipeline
                  ? pipeline.status === 'success' ||
                    (pipeline.status === 'completed' &&
                      pipeline.conclusion === 'success')
                    ? 'Passing'
                    : 'Check required'
                  : 'No runs'
              }
              offline={
                pipeline?.status === 'failed' ||
                (pipeline?.status === 'completed' &&
                  pipeline?.conclusion !== 'success')
              }
            />
          </div>
        </div>
      </section>

      {/* Recent Deployments */}
      <section className="panel deployments-panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">RELEASE MANAGEMENT</div>
            <h2>Recent deployments</h2>
            <p>Track releases and monitor deployment outcomes.</p>
          </div>
        </div>
        {deployments.length === 0 ? (
          <div className="empty-state">
            <Rocket size={28} />
            <p>No deployments yet</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DEPLOYMENT</th>
                    <th>COMMIT</th>
                    <th>BRANCH</th>
                    <th>STATUS</th>
                    <th>DURATION</th>
                    <th>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="deployment-id">
                          <span className="deployment-icon">
                            <PackageCheck size={15} />
                          </span>
                          <span>
                            <b>{item.id}</b>
                            <small>{item.version}</small>
                          </span>
                        </div>
                      </td>
                      <td className="commit-cell">{item.commit}</td>
                      <td>
                        <span className="branch-tag">
                          <GitBranch size={12} />
                          {item.branch}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            item.status === 'success'
                              ? 'status-success'
                              : 'status-failed'
                          }`}
                        >
                          {item.status === 'success' ? (
                            <Check size={12} />
                          ) : (
                            <X size={12} />
                          )}{' '}
                          {item.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="duration-cell">{item.duration}</td>
                      <td className="time-cell">
                        {relativeTime(item.time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-bottom">
              <span>
                Showing <b>{deployments.length}</b> recent deployments
              </span>
              <span>
                <i className="legend-dot" /> {successful} successful{' '}
                <i className="legend-dot failed-dot" /> {metrics.failed} failed
              </span>
            </div>
          </>
        )}
      </section>

      <section className="bottom-grid">
        <div className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">GET STARTED</div>
              <h2>Quick actions</h2>
            </div>
          </div>
          <div className="quick-actions">
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noreferrer"
              className="quick-action"
            >
              <span className="quick-icon github-icon">
                <Github size={18} />
              </span>
              <span>
                <b>Connect repository</b>
                <small>Link your GitHub project</small>
              </span>
              <ArrowUpRight size={15} />
            </a>
            <a
              href="https://docs.docker.com/get-started/"
              target="_blank"
              rel="noreferrer"
              className="quick-action"
            >
              <span className="quick-icon docker-icon">
                <Box size={18} />
              </span>
              <span>
                <b>Container guide</b>
                <small>Learn Docker basics</small>
              </span>
              <ArrowUpRight size={15} />
            </a>
            <a
              href="https://docs.github.com/en/actions"
              target="_blank"
              rel="noreferrer"
              className="quick-action"
            >
              <span className="quick-icon actions-icon">
                <Workflow size={18} />
              </span>
              <span>
                <b>Configure workflow</b>
                <small>Automate your delivery</small>
              </span>
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="panel info-panel">
          <div className="info-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-core">
              <Rocket size={26} />
            </div>
            <span className="art-star star-one">✦</span>
            <span className="art-star star-two">✧</span>
          </div>
          <div className="info-copy">
            <div className="section-kicker">SHIP WITH CONFIDENCE</div>
            <h2>Every release, under control.</h2>
            <p>
              Automate repetitive work and spend more time building what
              matters.
            </p>
            <a
              href="https://docs.github.com/en/actions"
              target="_blank"
              rel="noreferrer"
            >
              Explore CI/CD docs <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 DeployMate. Built for smoother deployments.</span>
        <span>
          <span className="footer-dot" /> All systems{' '}
          {health ? 'operational' : 'ready for local setup'}
        </span>
      </footer>
    </div>
  );
}
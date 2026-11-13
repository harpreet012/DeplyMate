import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'data.json');

const app = express();
const PORT = Number(process.env.PORT || 5000);
app.use(cors());
app.use(express.json());

// ─── Persistent data store ───────────────────────────────────────────────────
function loadData() {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')); } catch {}
  }
  return null;
}

function saveData(data) {
  try { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) {
    console.error('Failed to save data:', e.message);
  }
}

function initData() {
  const existing = loadData();
  if (existing) return existing;

  const now = Date.now();
  const data = {
    settings: {
      projectName: 'DeployMate',
      environment: 'production',
      apiUrl: 'http://localhost:5000',
      notificationsEnabled: true,
      autoRefresh: true,
      refreshInterval: 30,
      theme: 'dark',
      timezone: 'UTC',
      slackWebhook: '',
      emailAlerts: '',
      dockerRegistry: 'docker.io/library',
      branch: 'main',
      buildCommand: 'npm run build',
      nodeVersion: '20.x',
    },
    deployments: [
      { id: 'dep-1042', version: 'v1.0.0', commit: 'Initial project release', branch: 'main', status: 'success', duration: '42s', time: new Date(now - 1000 * 60 * 18).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'production' },
      { id: 'dep-1041', version: 'v0.9.4', commit: 'Add health endpoint', branch: 'main', status: 'success', duration: '38s', time: new Date(now - 1000 * 60 * 95).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'production' },
      { id: 'dep-1040', version: 'v0.9.3', commit: 'Fix responsive navigation', branch: 'feature/ui', status: 'failed', duration: '16s', time: new Date(now - 1000 * 60 * 60 * 4).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'staging', errorMessage: 'Test suite failed: 3 assertions did not pass' },
      { id: 'dep-1039', version: 'v0.9.2', commit: 'Configure Docker build', branch: 'main', status: 'success', duration: '51s', time: new Date(now - 1000 * 60 * 60 * 7).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'production' },
      { id: 'dep-1038', version: 'v0.9.1', commit: 'Add CI/CD pipeline config', branch: 'main', status: 'success', duration: '44s', time: new Date(now - 1000 * 60 * 60 * 24).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'production' },
      { id: 'dep-1037', version: 'v0.9.0', commit: 'Initial backend setup', branch: 'main', status: 'success', duration: '29s', time: new Date(now - 1000 * 60 * 60 * 48).toISOString(), triggeredBy: 'admin@deploymate.dev', environment: 'staging' },
    ],
    pipelines: [
      {
        id: 'pipe-001', name: 'deploymate-production', branch: 'main', runNumber: 1042,
        status: 'success', duration: '42s', createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
        triggeredBy: 'admin@deploymate.dev',
        stages: [
          { name: 'Source', detail: 'Checkout repository', status: 'success', time: '2s' },
          { name: 'Build', detail: 'Install & compile', status: 'success', time: '18s' },
          { name: 'Test', detail: 'Run automated tests', status: 'success', time: '8s' },
          { name: 'Docker', detail: 'Build container image', status: 'success', time: '11s' },
          { name: 'Deploy', detail: 'Release to production', status: 'success', time: '3s' },
        ]
      },
      {
        id: 'pipe-002', name: 'deploymate-staging', branch: 'feature/ui', runNumber: 1041,
        status: 'failed', duration: '24s', createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        triggeredBy: 'admin@deploymate.dev',
        stages: [
          { name: 'Source', detail: 'Checkout repository', status: 'success', time: '2s' },
          { name: 'Build', detail: 'Install & compile', status: 'success', time: '14s' },
          { name: 'Test', detail: 'Run automated tests', status: 'failed', time: '8s', error: '3 test assertions failed' },
          { name: 'Docker', detail: 'Build container image', status: 'skipped', time: '—' },
          { name: 'Deploy', detail: 'Release to staging', status: 'skipped', time: '—' },
        ]
      },
      {
        id: 'pipe-003', name: 'deploymate-review', branch: 'feature/settings', runNumber: 1040,
        status: 'success', duration: '37s', createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        triggeredBy: 'admin@deploymate.dev',
        stages: [
          { name: 'Source', detail: 'Checkout repository', status: 'success', time: '2s' },
          { name: 'Build', detail: 'Install & compile', status: 'success', time: '16s' },
          { name: 'Test', detail: 'Run automated tests', status: 'success', time: '10s' },
          { name: 'Docker', detail: 'Build container image', status: 'success', time: '7s' },
          { name: 'Deploy', detail: 'Release to review', status: 'success', time: '2s' },
        ]
      },
    ],
    activityLogs: [
      { id: 'log-001', type: 'deployment', message: 'Deployment dep-1042 completed successfully', user: 'admin@deploymate.dev', timestamp: new Date(now - 1000 * 60 * 18).toISOString(), level: 'success', meta: { deploymentId: 'dep-1042', environment: 'production' } },
      { id: 'log-002', type: 'pipeline', message: 'Pipeline deploymate-production #1042 passed all stages', user: 'system', timestamp: new Date(now - 1000 * 60 * 20).toISOString(), level: 'info', meta: { pipelineId: 'pipe-001' } },
      { id: 'log-003', type: 'deployment', message: 'Deployment dep-1040 failed during test stage', user: 'system', timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(), level: 'error', meta: { deploymentId: 'dep-1040', environment: 'staging' } },
      { id: 'log-004', type: 'pipeline', message: 'Pipeline deploymate-staging #1041 failed: test assertions did not pass', user: 'system', timestamp: new Date(now - 1000 * 60 * 60 * 4 + 1000 * 60 * 5).toISOString(), level: 'error', meta: { pipelineId: 'pipe-002' } },
      { id: 'log-005', type: 'settings', message: 'Settings updated: environment changed to production', user: 'admin@deploymate.dev', timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString(), level: 'info', meta: {} },
      { id: 'log-006', type: 'deployment', message: 'Deployment dep-1041 completed successfully', user: 'admin@deploymate.dev', timestamp: new Date(now - 1000 * 60 * 95).toISOString(), level: 'success', meta: { deploymentId: 'dep-1041', environment: 'production' } },
      { id: 'log-007', type: 'system', message: 'Backend API server started on port 5000', user: 'system', timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString(), level: 'info', meta: {} },
      { id: 'log-008', type: 'deployment', message: 'Deployment dep-1039 triggered by admin', user: 'admin@deploymate.dev', timestamp: new Date(now - 1000 * 60 * 60 * 7 - 1000 * 60 * 2).toISOString(), level: 'info', meta: { deploymentId: 'dep-1039', environment: 'production' } },
      { id: 'log-009', type: 'deployment', message: 'Deployment dep-1039 completed successfully', user: 'system', timestamp: new Date(now - 1000 * 60 * 60 * 7).toISOString(), level: 'success', meta: { deploymentId: 'dep-1039', environment: 'production' } },
      { id: 'log-010', type: 'pipeline', message: 'Pipeline deploymate-review #1040 passed all stages', user: 'system', timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(), level: 'success', meta: { pipelineId: 'pipe-003' } },
    ],
  };
  saveData(data);
  return data;
}

const startedAt = new Date();
let store = initData();
let logIdCounter = store.activityLogs.length + 1;

function addLog(type, message, user, level = 'info', meta = {}) {
  const id = `log-${String(logIdCounter++).padStart(3, '0')}`;
  const entry = { id, type, message, user, timestamp: new Date().toISOString(), level, meta };
  store.activityLogs.unshift(entry);
  if (store.activityLogs.length > 200) store.activityLogs.length = 200;
  saveData(store);
  return entry;
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'deploymate-api',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Metrics ─────────────────────────────────────────────────────────────────
app.get('/api/metrics', (_req, res) => {
  const { deployments } = store;
  const successful = deployments.filter(d => d.status === 'success').length;
  const failed = deployments.length - successful;
  const avgDuration = deployments
    .map(d => parseInt(d.duration) || 0)
    .reduce((a, b) => a + b, 0) / (deployments.length || 1);
  res.json({
    total: deployments.length,
    successful,
    failed,
    successRate: deployments.length ? Math.round((successful / deployments.length) * 100) : 0,
    avgDuration: `${Math.round(avgDuration)}s`,
  });
});

// ─── Deployments ──────────────────────────────────────────────────────────────
app.get('/api/deployments', (req, res) => {
  const { env, status, limit } = req.query;
  let list = [...store.deployments];
  if (env) list = list.filter(d => d.environment === env);
  if (status) list = list.filter(d => d.status === status);
  if (limit) list = list.slice(0, Number(limit));
  res.json({ deployments: list, total: list.length });
});

app.post('/api/deployments', (req, res) => {
  const { branch = 'main', environment = 'production', commit = 'Manual trigger', version } = req.body;
  const id = `dep-${1042 + store.deployments.length + 1}`;
  const ver = version || `v${1 + Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`;
  const duration = `${20 + Math.floor(Math.random() * 40)}s`;
  const status = Math.random() > 0.15 ? 'success' : 'failed';
  const dep = {
    id, version: ver, commit, branch, status, duration,
    time: new Date().toISOString(),
    triggeredBy: 'admin@deploymate.dev',
    environment,
    ...(status === 'failed' ? { errorMessage: 'Build failed: dependency resolution error' } : {}),
  };
  store.deployments.unshift(dep);
  addLog('deployment', `Deployment ${id} ${status === 'success' ? 'completed successfully' : 'failed'}`,
    'admin@deploymate.dev', status, { deploymentId: id, environment });
  saveData(store);
  res.status(201).json(dep);
});

app.delete('/api/deployments/:id', (req, res) => {
  const idx = store.deployments.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Deployment not found' });
  const [removed] = store.deployments.splice(idx, 1);
  addLog('deployment', `Deployment ${removed.id} deleted`, 'admin@deploymate.dev', 'info', { deploymentId: removed.id });
  saveData(store);
  res.json({ success: true, deleted: removed });
});

// ─── Pipelines ───────────────────────────────────────────────────────────────
app.get('/api/pipelines', (_req, res) => {
  res.json({ pipelines: store.pipelines, total: store.pipelines.length });
});

app.get('/api/pipelines/:id', (req, res) => {
  const pipeline = store.pipelines.find(p => p.id === req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  res.json(pipeline);
});

app.post('/api/pipelines/trigger', (req, res) => {
  const { branch = 'main', pipelineName } = req.body;
  const id = `pipe-${String(store.pipelines.length + 1).padStart(3, '0')}`;
  const runNumber = (store.pipelines[0]?.runNumber || 1042) + 1;
  const name = pipelineName || store.pipelines[0]?.name || 'deploymate-production';
  const newPipeline = {
    id,
    name,
    branch,
    runNumber,
    status: 'running',
    duration: '—',
    createdAt: new Date().toISOString(),
    triggeredBy: 'admin@deploymate.dev',
    stages: [
      { name: 'Source', detail: 'Checkout repository', status: 'running', time: '—' },
      { name: 'Build', detail: 'Install & compile', status: 'pending', time: '—' },
      { name: 'Test', detail: 'Run automated tests', status: 'pending', time: '—' },
      { name: 'Docker', detail: 'Build container image', status: 'pending', time: '—' },
      { name: 'Deploy', detail: 'Release to production', status: 'pending', time: '—' },
    ],
  };
  store.pipelines.unshift(newPipeline);
  addLog('pipeline', `Pipeline ${name} #${runNumber} triggered on branch ${branch}`,
    'admin@deploymate.dev', 'info', { pipelineId: id });

  // Simulate pipeline completion
  setTimeout(() => {
    const p = store.pipelines.find(p => p.id === id);
    if (!p) return;
    const success = Math.random() > 0.2;
    const totalSecs = 25 + Math.floor(Math.random() * 30);
    p.status = success ? 'success' : 'failed';
    p.duration = `${totalSecs}s`;
    const times = ['2s', '15s', '8s', '9s', '3s'];
    p.stages = p.stages.map((s, i) => {
      if (!success && i === 2) return { ...s, status: 'failed', time: times[i], error: 'Tests failed' };
      if (!success && i > 2) return { ...s, status: 'skipped', time: '—' };
      return { ...s, status: 'success', time: times[i] };
    });
    addLog('pipeline', `Pipeline ${name} #${runNumber} ${success ? 'passed all stages' : 'failed'}`,
      'system', success ? 'success' : 'error', { pipelineId: id });
    saveData(store);
  }, 8000);

  saveData(store);
  res.status(201).json(newPipeline);
});

// ─── Activity Logs ────────────────────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
  const { type, level, limit = 50, offset = 0 } = req.query;
  let logs = [...store.activityLogs];
  if (type && type !== 'all') logs = logs.filter(l => l.type === type);
  if (level && level !== 'all') logs = logs.filter(l => l.level === level);
  const total = logs.length;
  logs = logs.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ logs, total, hasMore: Number(offset) + Number(limit) < total });
});

app.delete('/api/activity', (_req, res) => {
  store.activityLogs = [];
  logIdCounter = 1;
  addLog('system', 'Activity log cleared by admin', 'admin@deploymate.dev', 'info');
  saveData(store);
  res.json({ success: true });
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', (_req, res) => res.json(store.settings));

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  const changed = Object.keys(updates).filter(k => store.settings[k] !== updates[k]);
  store.settings = { ...store.settings, ...updates };
  if (changed.length) {
    addLog('settings', `Settings updated: ${changed.join(', ')}`, 'admin@deploymate.dev', 'info', { changed });
  }
  saveData(store);
  res.json(store.settings);
});

app.patch('/api/settings', (req, res) => {
  const updates = req.body;
  const changed = Object.keys(updates).filter(k => store.settings[k] !== updates[k]);
  store.settings = { ...store.settings, ...updates };
  if (changed.length) {
    addLog('settings', `Settings updated: ${changed.join(', ')}`, 'admin@deploymate.dev', 'info', { changed });
  }
  saveData(store);
  res.json(store.settings);
});

// ─── API info ─────────────────────────────────────────────────────────────────
app.get('/api', (_req, res) => res.json({
  name: 'DeployMate API',
  version: '1.0.0',
  endpoints: ['/api/health', '/api/metrics', '/api/deployments', '/api/pipelines', '/api/activity', '/api/settings'],
}));

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`DeployMate API running at http://localhost:${PORT}`);
  });
}

export default app;
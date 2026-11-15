// Centralized API client with error handling

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  metrics: () => request('/api/metrics'),

  deployments: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/deployments${q ? '?' + q : ''}`);
    },
    create: (data) => request('/api/deployments', { method: 'POST', body: data }),
    delete: (id) => request(`/api/deployments/${id}`, { method: 'DELETE' }),
  },

  pipelines: {
    list: () => request('/api/pipelines'),
    get: (id) => request(`/api/pipelines/${id}`),
    trigger: (data) => request('/api/pipelines/trigger', { method: 'POST', body: data }),
  },

  activity: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/activity${q ? '?' + q : ''}`);
    },
    clear: () => request('/api/activity', { method: 'DELETE' }),
  },

  settings: {
    get: () => request('/api/settings'),
    update: (data) => request('/api/settings', { method: 'PUT', body: data }),
  },

  github: {
    status: () => request('/api/github/status'),
    workflows: () => request('/api/github/workflows'),
    runs: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/api/github/runs${q ? '?' + q : ''}`);
    },
    runDetails: (id) => request(`/api/github/runs/${id}`),
    jobs: (id) => request(`/api/github/runs/${id}/jobs`),
    logs: (id) => request(`/api/github/runs/${id}/logs`),
    dispatch: (data) => request('/api/github/dispatch', {
      method: 'POST',
      body: data,
    }),
  },
};
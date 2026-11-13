import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Save, Check, Settings, Bell, GitBranch, Box, Shield, Server } from 'lucide-react';
import { api } from '../api.js';

function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="panel-heading" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="stat-icon purple" style={{ width: 28, height: 28, borderRadius: 7 }}><Icon size={14} /></div>
          <div><div className="section-kicker">CONFIGURATION</div><h2 style={{ margin: '2px 0 0' }}>{title}</h2></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, description, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <span style={{ fontSize: 11, fontWeight: 600, color: '#c8d2e3' }}>{label}</span>
        {description && <span style={{ fontSize: 9, color: '#65738a', marginTop: 2 }}>{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      className="settings-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select className="settings-input settings-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      {label && <span style={{ fontSize: 10, color: '#c8d2e3', marginLeft: 8 }}>{label}</span>}
    </label>
  );
}

export default function SettingsPage({ setToast }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.settings.get();
      setSettings(data);
      setForm(data);
      setDirty(false);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const set = (key) => (value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.settings.update(form);
      setSettings(updated);
      setForm(updated);
      setDirty(false);
      setSaved(true);
      setToast('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setToast(`Error saving settings: ${e.message}`);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    setForm(settings);
    setDirty(false);
    setToast('Changes discarded');
  };

  if (loading) return <div className="page-wrap"><div className="loading-state"><RefreshCw size={24} className="spin" /><p>Loading settings…</p></div></div>;
  if (error) return <div className="page-wrap"><div className="error-state"><AlertCircle size={24} /><p>{error}</p><button className="button button-secondary" onClick={fetchSettings}>Retry</button></div></div>;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> WORKSPACE CONFIGURATION</div>
          <h1>Settings <span className="wave">⚙️</span></h1>
          <p>Configure your DeployMate workspace, integrations, and notifications.</p>
        </div>
        <div className="heading-actions">
          {dirty && <span style={{ fontSize: 9, color: '#f4a16e', background: '#3d2b2222', border: '1px solid #3d2b22', padding: '5px 10px', borderRadius: 6 }}>Unsaved changes</span>}
          <button className="button button-secondary" onClick={handleReset} disabled={!dirty}>Discard</button>
          <button className="button button-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <RefreshCw size={14} className="spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </section>

      {/* General */}
      <SettingsSection title="General" icon={Settings}>
        <FieldRow label="Project name" description="Name displayed across the dashboard">
          <TextInput value={form.projectName || ''} onChange={set('projectName')} placeholder="DeployMate" />
        </FieldRow>
        <FieldRow label="Default environment" description="Default deployment target">
          <SelectInput value={form.environment || 'production'} onChange={set('environment')} options={[
            { value: 'production', label: 'Production' },
            { value: 'staging', label: 'Staging' },
            { value: 'review', label: 'Review' },
          ]} />
        </FieldRow>
        <FieldRow label="Timezone" description="Used for log timestamps">
          <SelectInput value={form.timezone || 'UTC'} onChange={set('timezone')} options={[
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'Eastern (ET)' },
            { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
            { value: 'Europe/London', label: 'London (GMT)' },
            { value: 'Asia/Kolkata', label: 'India (IST)' },
          ]} />
        </FieldRow>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications" icon={Bell}>
        <FieldRow label="Enable notifications" description="Receive alerts for deployment events">
          <Toggle value={!!form.notificationsEnabled} onChange={set('notificationsEnabled')} />
        </FieldRow>
        <FieldRow label="Auto refresh dashboard" description="Automatically poll for new data">
          <Toggle value={!!form.autoRefresh} onChange={set('autoRefresh')} />
        </FieldRow>
        <FieldRow label="Refresh interval (seconds)" description="How often to auto-refresh (min 10s)">
          <TextInput
            type="number"
            value={form.refreshInterval || 30}
            onChange={v => set('refreshInterval')(Math.max(10, Number(v)))}
            placeholder="30"
          />
        </FieldRow>
        <FieldRow label="Email alerts" description="Comma-separated email addresses for alerts">
          <TextInput value={form.emailAlerts || ''} onChange={set('emailAlerts')} placeholder="ops@company.com, dev@company.com" />
        </FieldRow>
        <FieldRow label="Slack webhook" description="POST deployment notifications to Slack">
          <TextInput value={form.slackWebhook || ''} onChange={set('slackWebhook')} placeholder="https://hooks.slack.com/services/…" />
        </FieldRow>
      </SettingsSection>

      {/* Build */}
      <SettingsSection title="Build & Deploy" icon={GitBranch}>
        <FieldRow label="Default branch" description="Branch used for production deployments">
          <TextInput value={form.branch || 'main'} onChange={set('branch')} placeholder="main" />
        </FieldRow>
        <FieldRow label="Build command" description="Command to build the project">
          <TextInput value={form.buildCommand || ''} onChange={set('buildCommand')} placeholder="npm run build" />
        </FieldRow>
        <FieldRow label="Node.js version" description="Runtime version for builds">
          <SelectInput value={form.nodeVersion || '20.x'} onChange={set('nodeVersion')} options={[
            { value: '18.x', label: 'Node.js 18 LTS' },
            { value: '20.x', label: 'Node.js 20 LTS' },
            { value: '22.x', label: 'Node.js 22' },
          ]} />
        </FieldRow>
      </SettingsSection>

      {/* Infrastructure */}
      <SettingsSection title="Infrastructure" icon={Box}>
        <FieldRow label="Docker registry" description="Container registry for built images">
          <TextInput value={form.dockerRegistry || ''} onChange={set('dockerRegistry')} placeholder="docker.io/myorg" />
        </FieldRow>
        <FieldRow label="API base URL" description="Backend API endpoint">
          <TextInput value={form.apiUrl || ''} onChange={set('apiUrl')} placeholder="http://localhost:5000" />
        </FieldRow>
      </SettingsSection>

      {/* Danger zone */}
      <div className="panel" style={{ border: '1px solid #5a2d3a', marginBottom: 24 }}>
        <div className="panel-heading" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div className="stat-icon orange" style={{ width: 28, height: 28, borderRadius: 7 }}><Shield size={14} /></div>
            <div><div className="section-kicker" style={{ color: '#f28c9b' }}>DANGER ZONE</div><h2 style={{ margin: '2px 0 0' }}>Destructive actions</h2></div>
          </div>
        </div>
        <FieldRow label="Reset to defaults" description="Restore all settings to factory defaults">
          <button
            className="button button-secondary"
            style={{ color: '#f28c9b', borderColor: '#5a2d3a' }}
            onClick={async () => {
              if (!window.confirm('Reset all settings to defaults? This will clear your configuration.')) return;
              const defaults = {
                projectName: 'DeployMate', environment: 'production', apiUrl: 'http://localhost:5000',
                notificationsEnabled: true, autoRefresh: true, refreshInterval: 30, theme: 'dark',
                timezone: 'UTC', slackWebhook: '', emailAlerts: '', dockerRegistry: 'docker.io/library',
                branch: 'main', buildCommand: 'npm run build', nodeVersion: '20.x',
              };
              try {
                const updated = await api.settings.update(defaults);
                setSettings(updated); setForm(updated); setDirty(false);
                setToast('Settings reset to defaults');
              } catch (e) { setToast(`Error: ${e.message}`); }
            }}
          >
            Reset settings
          </button>
        </FieldRow>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Activity, Bell, CheckCircle2, ChevronDown, CircleAlert, Command,
  ExternalLink, Layers3, Menu, MoreHorizontal, Rocket, Settings,
  Workflow, X
} from 'lucide-react';
import Overview from './pages/Overview.jsx';
import Pipelines from './pages/Pipelines.jsx';
import Deployments from './pages/Deployments.jsx';
import ActivityLogs from './pages/ActivityLogs.jsx';
import SettingsPage from './pages/Settings.jsx';
const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: Layers3, exact: true },
  { to: '/pipelines', label: 'Pipelines', icon: Workflow, badge: null },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
];

const TOOL_ITEMS = [
  { to: '/activity', label: 'Activity logs', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function PageTitle() {
  const location = useLocation();
  const map = { '/': 'Overview', '/pipelines': 'Pipelines', '/deployments': 'Deployments', '/activity': 'Activity logs', '/settings': 'Settings' };
  return <b>{map[location.pathname] || 'Overview'}</b>;
}

function Sidebar({ mobileOpen, setMobileOpen }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Command size={20} /></div>
        <span>deploy<span className="brand-light">mate</span></span>
        <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      <div className="workspace-label">WORKSPACE</div>
      <button className="workspace-switch">
        <div className="workspace-avatar">A</div>
        <span><b>Acme Engineering</b><small>Free workspace</small></span>
        <ChevronDown size={15} />
      </button>

      <div className="nav-label">PLATFORM</div>
      <nav>
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="nav-label tools-label">TOOLS</div>
      <nav>
        {TOOL_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <div className="help-icon"><CircleAlert size={17} /></div>
          <b>Need a hand?</b>
          <p>Explore the quick-start guide to get the most out of DeployMate.</p>
          <a href="https://docs.github.com/en/actions" target="_blank" rel="noreferrer">
            View documentation <ExternalLink size={12} />
          </a>
        </div>
        <div className="user-profile">
          <div className="user-avatar">HJ</div>
          <span><b>Project Admin</b><small>admin@deploymate.dev</small></span>
          <MoreHorizontal size={18} />
        </div>
      </div>
    </aside>
  );
}

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToastState] = useState('');
  const location = useLocation();

  const setToast = (msg) => {
    setToastState(msg);
    if (msg) window.setTimeout(() => setToastState(''), 3000);
  };

  const pageLabel = {
    '/': 'Overview', '/pipelines': 'Pipelines', '/deployments': 'Deployments',
    '/activity': 'Activity logs', '/settings': 'Settings',
  }[location.pathname] || 'Overview';

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {mobileOpen && (
        <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={19} />
            </button>
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <PageTitle />
          </div>
          <div className="top-actions">
            <span className="environment"><i /> Production</span>
            <button className="icon-button notification" aria-label="Notifications">
              <Bell size={18} /><i />
            </button>
            <div className="top-avatar">HJ</div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Overview setToast={setToast} />} />
          <Route path="/pipelines" element={<Pipelines setToast={setToast} />} />
          <Route path="/deployments" element={<Deployments setToast={setToast} />} />
          <Route path="/activity" element={<ActivityLogs setToast={setToast} />} />
          <Route path="/settings" element={<SettingsPage setToast={setToast} />} />
          <Route path="*" element={<Overview setToast={setToast} />} />
        </Routes>
      </main>

      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
          <button onClick={() => setToastState('')} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: '⊞' },
  { to: '/alerts',        label: 'Alerts',         icon: '🚨' },
  { to: '/agencies',      label: 'Agencies',       icon: '🏛' },
  { to: '/users',         label: 'Users',          icon: '👥' },
  { to: '/notifications', label: 'Notif. Log',     icon: '🔔' },
  { to: '/reports',       label: 'Reports',        icon: '📊' },
  { to: '/settings',      label: 'Settings',       icon: '⚙' },
];

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/alerts':        'Alerts',
  '/agencies':      'Agencies',
  '/users':         'Users',
  '/notifications': 'Notification Log',
  '/reports':       'Reports',
  '/settings':      'Settings',
};

const ShellLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ||
    'Admin Console';

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden>🛡</div>
          <div>
            <div className="brand-title">LiveGuard</div>
            <div className="brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-user">
            <div className="sidebar-footer-name">
              {user?.full_name || user?.email || 'Admin'}
            </div>
            <div className="sidebar-footer-role">
              {user?.role || 'System Admin'}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-footer-logout"
            onClick={logout}
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="admin-body">
        <header className="admin-topbar">
          <span className="topbar-title">{pageTitle}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="topbar-user">{user?.full_name || user?.email || 'Admin'}</span>
            <button type="button" className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
};

export default ShellLayout;

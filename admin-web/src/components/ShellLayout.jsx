import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Siren,
  Building2,
  Users,
  Bell,
  BarChart2,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/alerts',        label: 'Alerts',         Icon: Siren },
  { to: '/agencies',      label: 'Agencies',       Icon: Building2 },
  { to: '/users',         label: 'Users',          Icon: Users },
  { to: '/notifications', label: 'Notif. Log',     Icon: Bell },
  { to: '/reports',       label: 'Reports',        Icon: BarChart2 },
  { to: '/settings',      label: 'Settings',       Icon: Settings },
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

function getRoleLabel(user) {
  if (user?.role === 'ADMIN') {
    if (user?.admin_level === 'SUPER_ADMIN') return 'Super Admin';
    return 'System Admin';
  }
  if (user?.role === 'AGENCY') return user?.agency_role || 'Agency Officer';
  return 'Civilian';
}

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
          <div className="brand-mark" aria-hidden><Shield size={24} /></div>
          <div>
            <div className="brand-title">LiveGuard</div>
            <div className="brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden><Icon size={16} /></span>
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
              {getRoleLabel(user)}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-footer-logout"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={16} />
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

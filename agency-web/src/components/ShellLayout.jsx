import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ShellLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <div className="brand-title">LiveGuard Agency</div>
            <div className="brand-sub">{user?.agency_name || 'Agency Console'}</div>
          </div>
        </div>
        <nav className="shell-nav">
          <Link
            className={location.pathname.startsWith('/assignments') ? 'active' : ''}
            to="/assignments"
          >
            Assignments
          </Link>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
};

export default ShellLayout;

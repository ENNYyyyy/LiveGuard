import { useEffect, useMemo, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchUsers, toggleUserActive } from '../api/admin';
import { parseApiError } from '../api/errors';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState(null); // user_id currently being toggled

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.phone_number]
        .filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [users, query]);

  const handleToggle = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} account for "${user.email}"?`)) return;
    setToggling(user.user_id);
    try {
      await toggleUserActive(user.user_id, !user.is_active);
      setUsers((prev) =>
        prev.map((u) => u.user_id === user.user_id ? { ...u, is_active: !u.is_active } : u)
      );
    } catch (err) {
      setError(parseApiError(err, `Failed to ${action} user.`));
    } finally {
      setToggling(null);
    }
  };

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Civilian Users</h2>
            <p>Registered civilian accounts on the platform.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="search-row">
          <input
            type="search"
            placeholder="Search by name, email, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <div className="list-state">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="list-state">No users found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Alerts</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.full_name || '—'}</td>
                    <td>{user.email}</td>
                    <td>{user.phone_number || '—'}</td>
                    <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>{user.alert_count ?? 0}</td>
                    <td>
                      <span className={`badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={user.is_active ? 'ghost-btn danger-btn' : 'ghost-btn'}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        disabled={toggling === user.user_id}
                        onClick={() => handleToggle(user)}
                      >
                        {toggling === user.user_id
                          ? '…'
                          : user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ShellLayout>
  );
};

export default UsersPage;

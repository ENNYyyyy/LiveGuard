import { useEffect, useMemo, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchUsers, toggleUserActive } from '../api/admin';
import { parseApiError } from '../api/errors';

const PAGE_SIZE = 20;

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allPageSelected = paginated.length > 0 && paginated.every((u) => selected.has(u.user_id));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((u) => next.delete(u.user_id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((u) => next.add(u.user_id));
        return next;
      });
    }
  };

  const handleBulk = async (activate) => {
    const ids = [...selected];
    if (!window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${ids.length} user(s)?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => toggleUserActive(id, activate)));
      setUsers((prev) =>
        prev.map((u) => selected.has(u.user_id) ? { ...u, is_active: activate } : u)
      );
      setSelected(new Set());
    } catch (err) {
      setError(parseApiError(err, 'Bulk action failed.'));
    } finally {
      setBulkBusy(false);
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

        {selected.size > 0 && (
          <div className="bulk-bar">
            <span>{selected.size} user{selected.size !== 1 ? 's' : ''} selected</span>
            <button className="primary-btn success" onClick={() => handleBulk(true)} disabled={bulkBusy}>Activate All</button>
            <button className="primary-btn danger" onClick={() => handleBulk(false)} disabled={bulkBusy}>Deactivate All</button>
            <button className="ghost-btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {loading ? (
          <div className="list-state">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="list-state">No users found.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} />
                    </th>
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
                  {paginated.map((user) => (
                    <tr key={user.user_id} className={selected.has(user.user_id) ? 'row-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={selected.has(user.user_id)} onChange={() => toggleSelect(user.user_id)} />
                      </td>
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
                          {toggling === user.user_id ? '…' : user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span className="page-info">Page {page} of {totalPages}</span>
                <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </ShellLayout>
  );
};

export default UsersPage;

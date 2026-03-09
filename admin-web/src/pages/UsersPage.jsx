import { useEffect, useMemo, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { useModal } from '../components/Modal';
import { fetchUsers, toggleUserActive } from '../api/admin';
import { parseApiError } from '../api/errors';

const PAGE_SIZE = 20;

// B4 — sortable column helper
const SortTh = ({ label, sortKey, sortConfig, onSort }) => {
  const active = sortConfig.key === sortKey;
  return (
    <th className="sortable-th" onClick={() => onSort(sortKey)}>
      {label}
      <span className="sort-indicator">
        {active ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );
};

const UsersPage = () => {
  const { confirm } = useModal();  // B1

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(1);

  // B4 — sort state
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });

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
    return term
      ? users.filter((u) =>
          [u.full_name, u.email, u.phone_number]
            .filter(Boolean).join(' ').toLowerCase().includes(term)
        )
      : users;
  }, [users, query]);

  // B4 — client-side sort of the current page's filtered rows
  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortConfig.key] ?? '';
      const bv = b[sortConfig.key] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };

  const handleToggle = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    // B1 — replace window.confirm with custom modal
    const ok = await confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} account for "${user.email}"?`,
      { title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`, confirmLabel: action.charAt(0).toUpperCase() + action.slice(1), danger: user.is_active }
    );
    if (!ok) return;
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    // B1 — replace window.confirm with custom modal
    const ok = await confirm(
      `${activate ? 'Activate' : 'Deactivate'} ${ids.length} user(s)?`,
      { title: `Bulk ${activate ? 'Activate' : 'Deactivate'}`, confirmLabel: activate ? 'Activate All' : 'Deactivate All', danger: !activate }
    );
    if (!ok) return;
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
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
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
        ) : sorted.length === 0 ? (
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
                    <SortTh label="#"         sortKey="user_id"     sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Full Name" sortKey="full_name"   sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Email"     sortKey="email"       sortConfig={sortConfig} onSort={handleSort} />
                    <th>Phone</th>
                    <SortTh label="Joined"    sortKey="date_joined" sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Alerts"    sortKey="alert_count" sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Status"    sortKey="is_active"   sortConfig={sortConfig} onSort={handleSort} />
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

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAlerts } from '../api/admin';
import { parseApiError } from '../api/errors';

// B4 — sortable column header
const SortTh = ({ label, sortKey, sortConfig, onSort, style }) => {
  const active = sortConfig.key === sortKey;
  return (
    <th className="sortable-th" onClick={() => onSort(sortKey)} style={style}>
      {label}
      <span className="sort-indicator">{active ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );
};

const STATUSES = ['', 'PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED'];
const TYPES = ['', 'TERRORISM', 'BANDITRY', 'KIDNAPPING', 'ARMED_ROBBERY', 'ROBBERY', 'FIRE_INCIDENCE', 'ACCIDENT', 'OTHER'];
const PRIORITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PAGE_SIZE = 20;

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '', priority: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // B4 — client-side sort of the currently loaded page
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAlerts({
        ...filters,
        search: search.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      });

      const rows = Array.isArray(data) ? data : (data?.results || []);
      const count = Array.isArray(data) ? rows.length : Number(data?.count ?? rows.length);

      setAlerts(rows);
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
    } catch (err) {
      setError(parseApiError(err, 'Failed to load alerts.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters, search, page]);

  const setFilter = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setPage(1);
  };

  // B4
  const handleSort = (key) => {
    setSortConfig((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedAlerts = useMemo(() => {
    if (!sortConfig.key) return alerts;
    return [...alerts].sort((a, b) => {
      const av = a[sortConfig.key] ?? '';
      const bv = b[sortConfig.key] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });
  }, [alerts, sortConfig]);

  const exportCsv = () => {
    const headers = ['ID', 'Type', 'Priority', 'Status', 'Reporter', 'Address', 'Created', 'Assignments'];
    const rows = alerts.map((a) => [
      a.alert_id,
      a.alert_type,
      a.priority_level,
      a.status,
      (a.reporter?.full_name || '').replace(/,/g, ' '),
      (a.address || '').replace(/,/g, ' '),
      new Date(a.created_at).toLocaleString(),
      a.assignment_count ?? 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-page-${page}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Alerts</h2>
            <p>
              All emergency alerts across the system.
              {totalCount > 0 && ` ${totalCount} result${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-btn" onClick={exportCsv} disabled={alerts.length === 0} title="Export current page as CSV">
              Export CSV
            </button>
            <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="search-row">
          <input
            type="search"
            placeholder="Search by ID, type, status, reporter, address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filter-bar">
          <label>Status</label>
          <select value={filters.status} onChange={setFilter('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
          <label>Type</label>
          <select value={filters.type} onChange={setFilter('type')}>
            {TYPES.map((t) => <option key={t} value={t}>{t || 'All'}</option>)}
          </select>
          <label>Priority</label>
          <select value={filters.priority} onChange={setFilter('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p || 'All'}</option>)}
          </select>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <div className="list-state">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="list-state">No alerts match the selected filters.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortTh label="#"           sortKey="alert_id"      sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Type"        sortKey="alert_type"    sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Priority"    sortKey="priority_level" sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Status"      sortKey="status"        sortConfig={sortConfig} onSort={handleSort} />
                    <th>Reporter</th>
                    <th>Address</th>
                    <SortTh label="Created"     sortKey="created_at"    sortConfig={sortConfig} onSort={handleSort} />
                    <SortTh label="Assignments" sortKey="assignment_count" sortConfig={sortConfig} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedAlerts.map((alert) => (
                    <tr key={alert.alert_id}>
                      <td><Link to={`/alerts/${alert.alert_id}`}>#{alert.alert_id}</Link></td>
                      <td><span className="badge type">{alert.alert_type}</span></td>
                      <td><span className={`badge ${(alert.priority_level || '').toLowerCase()}`}>{alert.priority_level}</span></td>
                      <td><span className={`badge ${(alert.status || '').toLowerCase()}`}>{alert.status}</span></td>
                      <td>{alert.reporter?.full_name || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.address || '—'}
                      </td>
                      <td>{new Date(alert.created_at).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>{alert.assignment_count ?? 0}</td>
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

export default AlertsPage;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAlerts } from '../api/admin';
import { parseApiError } from '../api/errors';

const STATUSES  = ['', 'PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED'];
const TYPES     = ['', 'TERRORISM', 'BANDITRY', 'KIDNAPPING', 'ARMED_ROBBERY', 'ROBBERY', 'FIRE_INCIDENCE', 'ACCIDENT', 'OTHER'];
const PRIORITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '', priority: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAlerts(filters);
      setAlerts(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load alerts.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const setFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Alerts</h2>
            <p>All emergency alerts across the system.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reporter</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th>Assignments</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
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
        )}
      </div>
    </ShellLayout>
  );
};

export default AlertsPage;

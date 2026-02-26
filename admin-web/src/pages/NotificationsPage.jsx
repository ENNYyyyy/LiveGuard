import { useEffect, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchNotifications } from '../api/admin';
import { parseApiError } from '../api/errors';

const CHANNELS  = ['', 'PUSH', 'SMS', 'EMAIL'];
const STATUSES  = ['', 'PENDING', 'SENT', 'DELIVERED', 'FAILED'];

const NotificationsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ channel: '', status: '', assignment: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications(filters);
      setLogs(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load notification logs.'));
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
            <h2>Notification Log</h2>
            <p>Audit trail of all notification delivery attempts.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="filter-bar">
          <label>Channel</label>
          <select value={filters.channel} onChange={setFilter('channel')}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c || 'All'}</option>)}
          </select>
          <label>Status</label>
          <select value={filters.status} onChange={setFilter('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
          <label>Assignment #</label>
          <input
            type="number"
            placeholder="e.g. 101"
            value={filters.assignment}
            onChange={setFilter('assignment')}
            style={{ width: 100 }}
          />
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <div className="list-state">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="list-state">No notification logs found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Log #</th>
                  <th>Alert #</th>
                  <th>Assignment #</th>
                  <th>Agency</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Error</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{log.log_id}</td>
                    <td>{log.alert_id ? `#${log.alert_id}` : '—'}</td>
                    <td>{log.assignment_id ? `#${log.assignment_id}` : '—'}</td>
                    <td>{log.agency_name || '—'}</td>
                    <td><span className="chip">{log.channel_type}</span></td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.recipient || '—'}
                    </td>
                    <td><span className={`badge ${(log.delivery_status || '').toLowerCase()}`}>{log.delivery_status}</span></td>
                    <td style={{ textAlign: 'center' }}>{log.retry_count ?? 0}</td>
                    <td style={{ color: 'var(--error-red)', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.error_message || '—'}
                    </td>
                    <td>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}</td>
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

export default NotificationsPage;

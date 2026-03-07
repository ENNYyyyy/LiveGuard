import { useEffect, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchNotifications, broadcastNotification } from '../api/admin';
import { parseApiError } from '../api/errors';

const CHANNELS  = ['', 'PUSH', 'SMS', 'EMAIL'];
const STATUSES  = ['', 'PENDING', 'SENT', 'DELIVERED', 'FAILED'];
const PAGE_SIZE = 25;

const NotificationsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ channel: '', status: '', assignment: '' });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [bcForm, setBcForm] = useState({ title: '', message: '', channel: 'PUSH' });
  const [bcBusy, setBcBusy] = useState(false);
  const [bcSuccess, setBcSuccess] = useState('');
  const [bcError, setBcError] = useState('');
  const setBc = (key) => (e) => setBcForm((p) => ({ ...p, [key]: e.target.value }));

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!bcForm.title.trim() || !bcForm.message.trim()) {
      setBcError('Title and message are required.');
      return;
    }
    setBcBusy(true);
    setBcSuccess('');
    setBcError('');
    try {
      const result = await broadcastNotification(bcForm);
      setBcSuccess(result?.message || 'Broadcast queued successfully.');
      setBcForm({ title: '', message: '', channel: 'PUSH' });
    } catch (err) {
      setBcError(parseApiError(err, 'Failed to send broadcast.'));
    } finally {
      setBcBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications({
        ...filters,
        page,
        page_size: PAGE_SIZE,
      });
      const rows = Array.isArray(data) ? data : (data?.results || []);
      const count = Array.isArray(data) ? rows.length : Number(data?.count ?? rows.length);
      setLogs(rows);
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
    } catch (err) {
      setError(parseApiError(err, 'Failed to load notification logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters, page]);

  const setFilter = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setPage(1);
  };

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Notification Log</h2>
            <p>
              Audit trail of all notification delivery attempts.
              {totalCount > 0 && ` ${totalCount} result${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* ── Broadcast form ── */}
        <div className="broadcast-card">
          <h3>Send Broadcast Notification</h3>
          <p>Push an alert or message to all registered civilian devices.</p>
          {bcSuccess ? <div className="success-banner">{bcSuccess}</div> : null}
          {bcError   ? <div className="error-banner">{bcError}</div>   : null}
          <form className="broadcast-form" onSubmit={handleBroadcast}>
            <div className="bc-row">
              <div className="form-card" style={{ flex: 2 }}>
                <label>Title</label>
                <input value={bcForm.title} onChange={setBc('title')} placeholder="e.g. System Alert" disabled={bcBusy} />
              </div>
              <div className="form-card" style={{ flex: 1 }}>
                <label>Channel</label>
                <select value={bcForm.channel} onChange={setBc('channel')} disabled={bcBusy}>
                  <option value="PUSH">Push</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>
            <div className="form-card">
              <label>Message</label>
              <textarea value={bcForm.message} onChange={setBc('message')} placeholder="Enter your message…" rows={3} disabled={bcBusy} />
            </div>
            <button type="submit" className="primary-btn" disabled={bcBusy}>
              {bcBusy ? 'Sending…' : 'Send Broadcast'}
            </button>
          </form>
        </div>

        <div className="section-title" style={{ marginTop: 24 }}>Delivery Log</div>

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
          <>
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

export default NotificationsPage;

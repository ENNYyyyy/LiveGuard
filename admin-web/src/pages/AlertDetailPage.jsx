import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAlert, fetchAgencies, assignAlert } from '../api/admin';
import { parseApiError } from '../api/errors';

const AlertDetailPage = () => {
  const { alertId } = useParams();

  const [alert, setAlert] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertData, agencyData] = await Promise.all([
        fetchAlert(alertId),
        fetchAgencies(),
      ]);
      setAlert(alertData);
      const list = Array.isArray(agencyData) ? agencyData : agencyData?.results || [];
      setAgencies(list.filter((a) => a.is_active));
    } catch (err) {
      setError(parseApiError(err, 'Failed to load alert.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [alertId]);

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!selectedAgency) return;
    setAssigning(true);
    setActionError('');
    setActionSuccess('');
    try {
      const result = await assignAlert(alertId, Number(selectedAgency));
      setActionSuccess(result.message || 'Alert assigned and dispatched.');
      const refreshed = await fetchAlert(alertId);
      setAlert(refreshed);
    } catch (err) {
      setActionError(parseApiError(err, 'Failed to assign alert.'));
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <ShellLayout><div className="panel"><div className="list-state">Loading alert...</div></div></ShellLayout>;
  }

  if (error) {
    return (
      <ShellLayout>
        <div className="panel">
          <div className="error-banner">{error}</div>
          <div className="inline-actions" style={{ marginTop: 12 }}>
            <button type="button" className="ghost-btn" onClick={load}>Retry</button>
            <Link className="ghost-btn" to="/alerts">Back to Alerts</Link>
          </div>
        </div>
      </ShellLayout>
    );
  }

  const loc = alert?.location;

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Alert #{alert?.alert_id}</h2>
            <p>
              <span className={`badge ${(alert?.alert_type || '').toLowerCase()} type`}>{alert?.alert_type}</span>
              {' '}
              <span className={`badge ${(alert?.priority_level || '').toLowerCase()}`}>{alert?.priority_level}</span>
              {' '}
              <span className={`badge ${(alert?.status || '').toLowerCase()}`}>{alert?.status}</span>
            </p>
          </div>
          <Link className="ghost-btn" to="/alerts">Back to Alerts</Link>
        </div>

        {actionError   ? <div className="error-banner">{actionError}</div>     : null}
        {actionSuccess ? <div className="success-banner">{actionSuccess}</div> : null}

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Incident Details</h3>
            <div className="kv-row"><span>Created</span><strong>{new Date(alert?.created_at).toLocaleString()}</strong></div>
            <div className="kv-row"><span>Updated</span><strong>{new Date(alert?.updated_at).toLocaleString()}</strong></div>
            <div className="kv-row"><span>Description</span><strong>{alert?.description || 'None provided'}</strong></div>
          </div>

          <div className="detail-card">
            <h3>Reporter</h3>
            <div className="kv-row"><span>Name</span><strong>{alert?.reporter?.full_name || '—'}</strong></div>
            <div className="kv-row"><span>Email</span><strong>{alert?.reporter?.email || '—'}</strong></div>
            <div className="kv-row"><span>Phone</span><strong>{alert?.reporter?.phone_number || '—'}</strong></div>
          </div>

          {loc ? (
            <div className="detail-card">
              <h3>Location</h3>
              <div className="kv-row"><span>Latitude</span><strong>{loc.latitude}</strong></div>
              <div className="kv-row"><span>Longitude</span><strong>{loc.longitude}</strong></div>
              <div className="kv-row"><span>Accuracy</span><strong>{loc.accuracy ?? '—'} m</strong></div>
              <div className="kv-row"><span>Address</span><strong>{loc.address || 'Not available'}</strong></div>
              {loc.maps_url ? (
                <a className="maps-link" href={loc.maps_url} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="detail-card form-card">
            <h3>Manual Assignment</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 8px' }}>
              Assign this alert to a specific agency and dispatch notifications immediately.
            </p>
            <form onSubmit={handleAssign}>
              <label htmlFor="agency-select">Select Agency</label>
              <select
                id="agency-select"
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                required
              >
                <option value="">— choose agency —</option>
                {agencies.map((a) => (
                  <option key={a.agency_id} value={a.agency_id}>
                    {a.agency_name} ({a.agency_type})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="primary-btn"
                disabled={assigning || !selectedAgency}
                style={{ marginTop: 8 }}
              >
                {assigning ? 'Dispatching...' : 'Assign & Dispatch'}
              </button>
            </form>
          </div>
        </div>

        {Array.isArray(alert?.assignments) && alert.assignments.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div className="section-title">Assignments ({alert.assignments.length})</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment #</th>
                    <th>Agency</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Notif. Status</th>
                    <th>Assigned At</th>
                    <th>Acknowledged By</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {alert.assignments.map((asgn) => (
                    <tr key={asgn.assignment_id}>
                      <td>#{asgn.assignment_id}</td>
                      <td>{asgn.agency_name}</td>
                      <td>{asgn.agency_type}</td>
                      <td>{asgn.assignment_priority}</td>
                      <td><span className={`badge ${(asgn.notification_status || '').toLowerCase()}`}>{asgn.notification_status}</span></td>
                      <td>{new Date(asgn.assigned_at).toLocaleString()}</td>
                      <td>{asgn.acknowledgment?.acknowledged_by || '—'}</td>
                      <td>{asgn.acknowledgment?.estimated_arrival ? `${asgn.acknowledgment.estimated_arrival} min` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </ShellLayout>
  );
};

export default AlertDetailPage;

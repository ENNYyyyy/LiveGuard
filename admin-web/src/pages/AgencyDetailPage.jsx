import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAgency, deleteAgency } from '../api/admin';
import { parseApiError } from '../api/errors';

const AgencyDetailPage = () => {
  const { agencyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [agency, setAgency] = useState(location.state?.agency || null);
  const [loading, setLoading] = useState(!agency);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAgency(agencyId);
      setAgency(data);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load agency.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!agency) load();
  }, [agencyId]);

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate "${agency?.agency_name}"? This disables them from receiving alerts.`)) return;
    setDeactivating(true);
    setActionError('');
    try {
      await deleteAgency(agencyId);
      navigate('/agencies', { replace: true });
    } catch (err) {
      setActionError(parseApiError(err, 'Failed to deactivate agency.'));
      setDeactivating(false);
    }
  };

  if (loading) {
    return <ShellLayout><div className="panel"><div className="list-state">Loading agency...</div></div></ShellLayout>;
  }

  if (error) {
    return (
      <ShellLayout>
        <div className="panel">
          <div className="error-banner">{error}</div>
          <div className="inline-actions" style={{ marginTop: 12 }}>
            <button type="button" className="ghost-btn" onClick={load}>Retry</button>
            <Link className="ghost-btn" to="/agencies">Back to Agencies</Link>
          </div>
        </div>
      </ShellLayout>
    );
  }

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>{agency?.agency_name}</h2>
            <p>Agency #{agency?.agency_id} · {agency?.agency_type}</p>
          </div>
          <div className="panel-actions">
            <Link className="ghost-btn" to="/agencies">Back</Link>
            <Link className="primary-btn" to={`/agencies/${agencyId}/edit`} state={{ agency }}>
              Edit
            </Link>
            {agency?.is_active ? (
              <button
                type="button"
                className="primary-btn danger"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            ) : (
              <span className="badge inactive" style={{ padding: '8px 14px' }}>Inactive</span>
            )}
          </div>
        </div>

        {actionError ? <div className="error-banner">{actionError}</div> : null}

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Agency Info</h3>
            <div className="kv-row"><span>Type</span><strong><span className="badge type">{agency?.agency_type}</span></strong></div>
            <div className="kv-row"><span>Status</span><strong><span className={`badge ${agency?.is_active ? 'active' : 'inactive'}`}>{agency?.is_active ? 'Active' : 'Inactive'}</span></strong></div>
            <div className="kv-row"><span>Jurisdiction</span><strong>{agency?.jurisdiction || '—'}</strong></div>
            <div className="kv-row"><span>Address</span><strong>{agency?.address || '—'}</strong></div>
            <div className="kv-row"><span>Operational Capacity</span><strong>{agency?.operational_capacity || '—'}</strong></div>
            <div className="kv-row"><span>Active Alerts</span><strong>{agency?.active_alert_count ?? 0}</strong></div>
          </div>

          <div className="detail-card">
            <h3>Contact Details</h3>
            <div className="kv-row"><span>Email</span><strong>{agency?.contact_email || '—'}</strong></div>
            <div className="kv-row"><span>Phone</span><strong>{agency?.contact_phone || '—'}</strong></div>
            <div className="kv-row"><span>Staff Count</span><strong>{agency?.staff_count ?? 0}</strong></div>
          </div>
        </div>

        {Array.isArray(agency?.staff) && agency.staff.length > 0 ? (
          <div className="detail-card" style={{ marginTop: 14 }}>
            <h3>Staff</h3>
            <div className="staff-list">
              {agency.staff.map((member) => (
                <div className="staff-row" key={member.user_id}>
                  <div>
                    <div className="staff-name">{member.full_name}</div>
                    <div className="staff-role">{member.email} · {member.phone_number}</div>
                  </div>
                  <span className="badge type">{member.role}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ShellLayout>
  );
};

export default AgencyDetailPage;

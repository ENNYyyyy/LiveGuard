import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAgency, deleteAgency, createAgencyStaff, removeAgencyStaff } from '../api/admin';
import { parseApiError } from '../api/errors';

const ROLES = ['DISPATCHER', 'RESPONDER', 'COMMANDER'];

const BLANK_STAFF_FORM = { full_name: '', email: '', password: '', phone_number: '', role: 'DISPATCHER' };

const AgencyDetailPage = () => {
  const { agencyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [agency, setAgency] = useState(location.state?.agency || null);
  const [loading, setLoading] = useState(!agency);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState(BLANK_STAFF_FORM);
  const [staffError, setStaffError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

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

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffSaving(true);
    setStaffError('');
    try {
      const updated = await createAgencyStaff(agencyId, staffForm);
      setAgency(updated);
      setShowAddStaff(false);
      setStaffForm(BLANK_STAFF_FORM);
    } catch (err) {
      setStaffError(parseApiError(err, 'Failed to add staff member.'));
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRemoveStaff = async (userId, name) => {
    if (!window.confirm(`Remove "${name}" from this agency? Their account will be deleted.`)) return;
    setRemovingId(userId);
    try {
      const updated = await removeAgencyStaff(agencyId, userId);
      setAgency(updated);
    } catch (err) {
      setActionError(parseApiError(err, 'Failed to remove staff member.'));
    } finally {
      setRemovingId(null);
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

        <div className="detail-card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Staff</h3>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => { setShowAddStaff((v) => !v); setStaffError(''); }}
            >
              {showAddStaff ? 'Cancel' : 'Add Staff'}
            </button>
          </div>

          {showAddStaff && (
            <form onSubmit={handleAddStaff} className="detail-card form-card" style={{ marginBottom: 16 }}>
              <label htmlFor="sf_full_name">Full Name</label>
              <input
                id="sf_full_name"
                required
                placeholder="e.g. John Bello"
                value={staffForm.full_name}
                onChange={(e) => setStaffForm((f) => ({ ...f, full_name: e.target.value }))}
              />
              <label htmlFor="sf_email">Email</label>
              <input
                id="sf_email"
                required
                type="email"
                placeholder="officer@agency.gov.ng"
                value={staffForm.email}
                onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
              />
              <label htmlFor="sf_password">Password</label>
              <input
                id="sf_password"
                required
                type="password"
                placeholder="Minimum 8 characters"
                value={staffForm.password}
                onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
              />
              <label htmlFor="sf_phone">Phone Number</label>
              <input
                id="sf_phone"
                required
                placeholder="+2348012345678"
                value={staffForm.phone_number}
                onChange={(e) => setStaffForm((f) => ({ ...f, phone_number: e.target.value }))}
              />
              <label htmlFor="sf_role">Role</label>
              <select
                id="sf_role"
                value={staffForm.role}
                onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {staffError ? <div className="error-banner">{staffError}</div> : null}
              <button type="submit" className="primary-btn" disabled={staffSaving}>
                {staffSaving ? 'Adding...' : 'Add Member'}
              </button>
            </form>
          )}

          {Array.isArray(agency?.staff) && agency.staff.length > 0 ? (
            <div className="staff-list">
              {agency.staff.map((member) => (
                <div className="staff-row" key={member.user_id}>
                  <div>
                    <div className="staff-name">{member.full_name}</div>
                    <div className="staff-role">{member.email} · {member.phone_number}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge type">{member.role}</span>
                    <button
                      type="button"
                      className="primary-btn danger"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={removingId === member.user_id}
                      onClick={() => handleRemoveStaff(member.user_id, member.full_name)}
                    >
                      {removingId === member.user_id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="list-state" style={{ fontSize: 13 }}>No staff members yet.</div>
          )}
        </div>
      </div>
    </ShellLayout>
  );
};

export default AgencyDetailPage;

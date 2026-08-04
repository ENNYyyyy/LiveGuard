import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { useModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fetchAgency, deleteAgency, createAgencyStaff, removeAgencyStaff, updateAgencyStaff } from '../api/admin';
import { parseApiError } from '../api/errors';

const ROLES = ['DISPATCHER', 'RESPONDER', 'COMMANDER'];

const BLANK_STAFF_FORM = { full_name: '', email: '', password: '', phone_number: '', role: 'DISPATCHER' };

// B3 — client-side validation for the Add Staff form
const validateEditForm = (form) => {
  const errs = {};
  if (!form.full_name.trim()) errs.full_name = 'Full name is required';
  if (form.phone_number.trim() && !/^\+\d{7,15}$/.test(form.phone_number.trim())) {
    errs.phone_number = 'Must start with "+" followed by 7–15 digits (e.g. +2348012345678)';
  }
  return errs;
};

const validateStaffForm = (form) => {
  const errs = {};
  if (!form.full_name.trim()) errs.full_name = 'Full name is required';
  if (!form.email.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
  if (!form.password.trim()) errs.password = 'Password is required';
  else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
  if (!form.phone_number.trim()) errs.phone_number = 'Phone number is required';
  return errs;
};

const AgencyDetailPage = () => {
  const { agencyId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useModal();   // B1
  const toast = useToast();          // B8

  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState(BLANK_STAFF_FORM);
  const [staffFieldErrors, setStaffFieldErrors] = useState({});  // B3
  const [staffError, setStaffError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  // B7 — edit staff inline form
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone_number: '', role: 'DISPATCHER' });
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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

  // B2 — always load from API on agencyId change (no location.state dependency)
  useEffect(() => {
    load();
  }, [agencyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeactivate = async () => {
    // B1 — replace window.confirm with custom modal
    const ok = await confirm(
      `Deactivate "${agency?.agency_name}"? This disables them from receiving alerts.`,
      { title: 'Deactivate Agency', confirmLabel: 'Deactivate', danger: true }
    );
    if (!ok) return;
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
    // B3 — client-side validation before hitting the backend
    const errs = validateStaffForm(staffForm);
    setStaffFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setStaffSaving(true);
    setStaffError('');
    try {
      const updated = await createAgencyStaff(agencyId, staffForm);
      setAgency(updated);
      setShowAddStaff(false);
      setStaffForm(BLANK_STAFF_FORM);
      setStaffFieldErrors({});
    } catch (err) {
      setStaffError(parseApiError(err, 'Failed to add staff member.'));
    } finally {
      setStaffSaving(false);
    }
  };

  const handleEditStaff = (member) => {
    setEditingId(member.user_id);
    setEditForm({ full_name: member.full_name, phone_number: member.phone_number || '', role: member.role });
    setEditFieldErrors({});
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validateEditForm(editForm);
    setEditFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateAgencyStaff(agencyId, editingId, {
        full_name: editForm.full_name.trim(),
        phone_number: editForm.phone_number.trim() || undefined,
        role: editForm.role,
      });
      setAgency(updated);
      setEditingId(null);
      toast('Staff member updated successfully.', 'success');
    } catch (err) {
      setEditError(parseApiError(err, 'Failed to update staff member.'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleRemoveStaff = async (userId, name) => {
    // B1 — replace window.confirm with custom modal
    const ok = await confirm(
      `Remove "${name}" from this agency? Their account will be deleted.`,
      { title: 'Remove Staff Member', confirmLabel: 'Remove', danger: true }
    );
    if (!ok) return;
    setRemovingId(userId);
    try {
      const updated = await removeAgencyStaff(agencyId, userId);
      setAgency(updated);
      // B8 — success toast after staff removal
      toast(`${name} has been removed from the agency.`, 'success');
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
            <Link className="primary-btn" to={`/agencies/${agencyId}/edit`}>
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
              onClick={() => { setShowAddStaff((v) => !v); setStaffError(''); setStaffFieldErrors({}); }}
            >
              {showAddStaff ? 'Cancel' : 'Add Staff'}
            </button>
          </div>

          {showAddStaff && (
            <form onSubmit={handleAddStaff} className="detail-card form-card" style={{ marginBottom: 16 }} noValidate>
              <label htmlFor="sf_full_name">Full Name</label>
              <input
                id="sf_full_name"
                placeholder="e.g. John Bello"
                value={staffForm.full_name}
                onChange={(e) => setStaffForm((f) => ({ ...f, full_name: e.target.value }))}
              />
              {staffFieldErrors.full_name && <span className="field-err">{staffFieldErrors.full_name}</span>}

              <label htmlFor="sf_email">Email</label>
              <input
                id="sf_email"
                type="email"
                placeholder="officer@agency.gov.ng"
                value={staffForm.email}
                onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
              />
              {staffFieldErrors.email && <span className="field-err">{staffFieldErrors.email}</span>}

              <label htmlFor="sf_password">Password</label>
              <input
                id="sf_password"
                type="password"
                placeholder="Minimum 8 characters"
                value={staffForm.password}
                onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
              />
              {staffFieldErrors.password && <span className="field-err">{staffFieldErrors.password}</span>}

              <label htmlFor="sf_phone">Phone Number</label>
              <input
                id="sf_phone"
                placeholder="+2348012345678"
                value={staffForm.phone_number}
                onChange={(e) => setStaffForm((f) => ({ ...f, phone_number: e.target.value }))}
              />
              {staffFieldErrors.phone_number && <span className="field-err">{staffFieldErrors.phone_number}</span>}

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
                <div key={member.user_id}>
                  <div className="staff-row">
                    <div>
                      <div className="staff-name">{member.full_name}</div>
                      <div className="staff-role">{member.email} · {member.phone_number}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge type">{member.role}</span>
                      <button
                        type="button"
                        className="ghost-btn"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        disabled={removingId === member.user_id}
                        onClick={() => editingId === member.user_id ? setEditingId(null) : handleEditStaff(member)}
                      >
                        {editingId === member.user_id ? 'Cancel' : 'Edit'}
                      </button>
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

                  {editingId === member.user_id && (
                    <form
                      onSubmit={handleEditSubmit}
                      className="detail-card form-card"
                      style={{ margin: '8px 0 12px', padding: '14px 16px' }}
                      noValidate
                    >
                      <label htmlFor="ef_full_name">Full Name</label>
                      <input
                        id="ef_full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                        disabled={editSaving}
                      />
                      {editFieldErrors.full_name && <span className="field-err">{editFieldErrors.full_name}</span>}

                      <label htmlFor="ef_phone">Phone Number</label>
                      <input
                        id="ef_phone"
                        placeholder="+2348012345678"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))}
                        disabled={editSaving}
                      />
                      {editFieldErrors.phone_number && <span className="field-err">{editFieldErrors.phone_number}</span>}

                      <label htmlFor="ef_role">Role</label>
                      <select
                        id="ef_role"
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                        disabled={editSaving}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>

                      {editError ? <div className="error-banner">{editError}</div> : null}
                      <button type="submit" className="primary-btn" disabled={editSaving}>
                        {editSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </form>
                  )}
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

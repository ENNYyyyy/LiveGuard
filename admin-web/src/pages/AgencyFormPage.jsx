import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { createAgency, fetchAgency, updateAgency } from '../api/admin';
import { parseApiError } from '../api/errors';

const AGENCY_TYPES = ['POLICE', 'FIRE', 'MEDICAL', 'MILITARY', 'SECURITY_FORCE'];

const EMPTY_FORM = {
  agency_name: '',
  agency_type: 'POLICE',
  contact_email: '',
  contact_phone: '',
  jurisdiction: '',
  address: '',
  operational_capacity: '',
  is_active: true,
};

const AgencyFormPage = () => {
  const { agencyId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(agencyId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const data = await fetchAgency(agencyId);
        setForm({
          agency_name:          data.agency_name ?? '',
          agency_type:          data.agency_type ?? 'POLICE',
          contact_email:        data.contact_email ?? '',
          contact_phone:        data.contact_phone ?? '',
          jurisdiction:         data.jurisdiction ?? '',
          address:              data.address ?? '',
          operational_capacity: data.operational_capacity ?? '',
          is_active:            data.is_active ?? true,
        });
      } catch (err) {
        setError(parseApiError(err, 'Failed to load agency.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agencyId, isEdit]);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form };
      let saved;
      if (isEdit) {
        saved = await updateAgency(agencyId, payload);
      } else {
        saved = await createAgency(payload);
      }
      navigate(`/agencies/${saved.agency_id}`, { replace: true });
    } catch (err) {
      setError(parseApiError(err, 'Failed to save agency.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ShellLayout>
        <div className="panel"><div className="list-state">Loading...</div></div>
      </ShellLayout>
    );
  }

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>{isEdit ? 'Edit Agency' : 'Add Agency'}</h2>
            <p>{isEdit ? `Updating agency #${agencyId}` : 'Register a new security agency.'}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="detail-grid">
            <div className="detail-card form-card">
              <h3>Basic Info</h3>

              <label htmlFor="agency_name">Agency Name</label>
              <input id="agency_name" value={form.agency_name} onChange={set('agency_name')} required placeholder="Lagos Police Force" />

              <label htmlFor="agency_type">Agency Type</label>
              <select id="agency_type" value={form.agency_type} onChange={set('agency_type')}>
                {AGENCY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <label htmlFor="jurisdiction">Jurisdiction</label>
              <input id="jurisdiction" value={form.jurisdiction} onChange={set('jurisdiction')} placeholder="Lagos State" />

              <label htmlFor="address">Address</label>
              <input id="address" value={form.address} onChange={set('address')} placeholder="123 Station Road, Lagos" />

              <label htmlFor="operational_capacity">Operational Capacity</label>
              <input id="operational_capacity" value={form.operational_capacity} onChange={set('operational_capacity')} placeholder="e.g. 250 or HIGH" />

              <div className="toggle-row">
                <input id="is_active" type="checkbox" checked={form.is_active} onChange={set('is_active')} />
                <label htmlFor="is_active">Active</label>
              </div>
            </div>

            <div className="detail-card form-card">
              <h3>Contact Details</h3>

              <label htmlFor="contact_email">Contact Email</label>
              <input id="contact_email" type="email" value={form.contact_email} onChange={set('contact_email')} required placeholder="contact@agency.gov.ng" />

              <label htmlFor="contact_phone">Contact Phone</label>
              <input id="contact_phone" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+2348012345678" />

              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <button className="primary-btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
                  {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Agency'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ShellLayout>
  );
};

export default AgencyFormPage;

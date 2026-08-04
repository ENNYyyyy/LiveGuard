import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ShellLayout from '../components/ShellLayout';
import { fetchAgencies } from '../api/admin';
import { parseApiError } from '../api/errors';

const AgenciesPage = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAgencies();
      setAgencies(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load agencies.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return agencies;
    return agencies.filter((a) =>
      [a.agency_name, a.agency_type, a.jurisdiction, a.contact_email]
        .filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [agencies, query]);

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Agencies</h2>
            <p>Manage security agencies and their contact details.</p>
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link className="primary-btn" to="/agencies/new">Add Agency</Link>
          </div>
        </div>

        <div className="search-row">
          <input
            type="search"
            placeholder="Search by name, type, jurisdiction..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <div className="list-state">Loading agencies...</div>
        ) : filtered.length === 0 ? (
          <div className="list-state">No agencies found.</div>
        ) : (
          <div className="card-grid">
            {filtered.map((agency) => (
              <Link
                key={agency.agency_id}
                to={`/agencies/${agency.agency_id}`}
                state={{ agency }}
                className="item-card"
              >
                <div className="card-top">
                  <span className="badge type">{agency.agency_type}</span>
                  <span className={`badge ${agency.is_active ? 'active' : 'inactive'}`}>
                    {agency.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-title">{agency.agency_name}</div>
                <div className="card-subtitle">{agency.jurisdiction || 'No jurisdiction set'}</div>
                <div className="card-meta">
                  <span>Staff: {agency.staff_count ?? 0}</span>
                  <span>Active alerts: {agency.active_alert_count ?? 0}</span>
                  <span>{agency.contact_email}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ShellLayout>
  );
};

export default AgenciesPage;

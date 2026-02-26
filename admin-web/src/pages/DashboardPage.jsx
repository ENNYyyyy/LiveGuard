import { useEffect, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchDashboard } from '../api/admin';
import { parseApiError } from '../api/errors';

const fmtSeconds = (s) => {
  if (s == null) return 'N/A';
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = (mins / 60).toFixed(1);
  return `${hrs} hr`;
};

const BreakdownCard = ({ title, data }) => (
  <div className="breakdown-card">
    <h3>{title}</h3>
    {Object.entries(data || {}).map(([key, val]) => (
      <div className="breakdown-row" key={key}>
        <span className="b-key">{key}</span>
        <span className="b-val">{val}</span>
      </div>
    ))}
  </div>
);

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchDashboard();
      setData(result);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = data?.totals || {};

  return (
    <ShellLayout>
      <div className="panel-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 13 }}>
            System-wide overview
          </p>
        </div>
        <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {loading && !data ? (
        <div className="list-state">Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Alerts (All Time)</div>
              <div className="stat-value">{totals.alerts_all_time ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Alerts Today</div>
              <div className="stat-value">{totals.alerts_today ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Week</div>
              <div className="stat-value">{totals.alerts_this_week ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Agencies</div>
              <div className="stat-value">{totals.agencies_active ?? '—'}</div>
              <div className="stat-sub">of {totals.agencies_total ?? '?'} total</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Civilian Users</div>
              <div className="stat-value">{totals.civilian_users ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Response</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {fmtSeconds(data?.avg_agency_response_seconds)}
              </div>
            </div>
          </div>

          <div className="breakdown-grid">
            <BreakdownCard title="By Status"   data={data?.alerts_by_status}   />
            <BreakdownCard title="By Type"     data={data?.alerts_by_type}     />
            <BreakdownCard title="By Priority" data={data?.alerts_by_priority} />
          </div>
        </>
      )}
    </ShellLayout>
  );
};

export default DashboardPage;

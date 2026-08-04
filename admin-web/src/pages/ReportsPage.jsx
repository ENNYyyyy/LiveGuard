import { useEffect, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchReports } from '../api/admin';
import { parseApiError } from '../api/errors';

const fmtSeconds = (s) => {
  if (s == null) return '—';
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${(mins / 60).toFixed(1)} hr`;
};

const rateClass = (pct) => {
  if (pct == null) return '';
  if (pct >= 95) return 'good';
  if (pct >= 80) return 'warn';
  return 'bad';
};

const ReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchReports());
    } catch (err) {
      setError(parseApiError(err, 'Failed to load reports.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Reports</h2>
            <p>
              Aggregated system metrics.
              {data?.generated_at ? ` Generated ${new Date(data.generated_at).toLocaleString()}` : ''}
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading && !data ? (
          <div className="list-state">Loading reports...</div>
        ) : (
          <>
            {/* Volume */}
            <div className="section-title">Alert Volume</div>
            <div className="volume-grid">
              {[
                { period: 'Last 24 h',  val: data?.alert_volume?.last_24h  },
                { period: 'Last 7 days', val: data?.alert_volume?.last_7d   },
                { period: 'Last 30 days',val: data?.alert_volume?.last_30d  },
                { period: 'All Time',    val: data?.alert_volume?.all_time  },
              ].map(({ period, val }) => (
                <div className="vol-card" key={period}>
                  <div className="vol-period">{period}</div>
                  <div className="vol-count">{val ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Type + Status distributions */}
            <div className="breakdown-grid">
              <div className="breakdown-card">
                <h3>By Alert Type</h3>
                {Object.entries(data?.alert_types || {}).map(([k, v]) => (
                  <div className="breakdown-row" key={k}>
                    <span className="b-key">{k}</span>
                    <span className="b-val">{v}</span>
                  </div>
                ))}
              </div>

              <div className="breakdown-card">
                <h3>By Status</h3>
                {Object.entries(data?.alert_statuses || {}).map(([k, v]) => (
                  <div className="breakdown-row" key={k}>
                    <span className="b-key"><span className={`badge ${k.toLowerCase()}`}>{k}</span></span>
                    <span className="b-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification delivery rates */}
            <div className="section-title">Notification Delivery Rates</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Total Sent</th>
                    <th>Successful</th>
                    <th>Failed</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.notification_delivery || {}).map(([channel, stats]) => (
                    <tr key={channel}>
                      <td><span className="chip">{channel}</span></td>
                      <td>{stats.total ?? '—'}</td>
                      <td>{stats.sent ?? '—'}</td>
                      <td>{stats.failed ?? '—'}</td>
                      <td>
                        <span className={`delivery-rate ${rateClass(stats.success_rate)}`}>
                          {stats.success_rate != null ? `${stats.success_rate.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Avg response time by agency type */}
            <div className="section-title">Avg Response Time by Agency Type</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agency Type</th>
                    <th>Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.avg_response_seconds_by_agency_type || {}).map(([type, seconds]) => (
                    <tr key={type}>
                      <td><span className="badge type">{type}</span></td>
                      <td>{fmtSeconds(seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ShellLayout>
  );
};

export default ReportsPage;

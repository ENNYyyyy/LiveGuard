import { useEffect, useState } from 'react';
import ShellLayout from '../components/ShellLayout';
import { fetchSettings, updateSettings } from '../api/admin';
import { parseApiError } from '../api/errors';

const SettingsPage = () => {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSettings();
      const list = Array.isArray(data) ? data : [];
      setSettings(list);
      const vals = Object.fromEntries(list.map((s) => [s.key, s.value]));
      setValues(vals);
      setOriginal(vals);
    } catch (err) {
      setError(parseApiError(err, 'Failed to load settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Only send keys whose value changed
    const changed = {};
    for (const [key, val] of Object.entries(values)) {
      if (val !== original[key]) changed[key] = val;
    }

    if (Object.keys(changed).length === 0) {
      setSuccess('No changes to save.');
      setSubmitting(false);
      return;
    }

    try {
      const result = await updateSettings(changed);
      const updated = result.updated || Object.keys(changed);
      setSuccess(`Saved: ${updated.join(', ')}`);
      setOriginal((prev) => ({ ...prev, ...changed }));
    } catch (err) {
      setError(parseApiError(err, 'Failed to save settings.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ShellLayout>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>System Settings</h2>
            <p>Operational parameters — changes take effect immediately, no restart required.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Reload'}
          </button>
        </div>

        {error   ? <div className="error-banner">{error}</div>     : null}
        {success ? <div className="success-banner">{success}</div> : null}

        {loading ? (
          <div className="list-state">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="settings-list">
              {settings.map((s) => (
                <div className="setting-row" key={s.key}>
                  <div className="setting-info">
                    <div className="setting-key">{s.key}</div>
                    {s.description ? <div className="setting-desc">{s.description}</div> : null}
                    {s.updated_at ? (
                      <div className="setting-updated">
                        Last updated: {new Date(s.updated_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={values[s.key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [s.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ShellLayout>
  );
};

export default SettingsPage;

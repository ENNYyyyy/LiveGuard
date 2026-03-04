import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAgencyAssignments,
  fetchAssignmentLocation,
  acknowledgeAssignment,
  updateAssignmentStatus,
} from '../api/agency';
import { parseApiError } from '../api/errors';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const AGENCY_TO_ALERT = {
  FIRE:           'FIRE/RESCUE',
  POLICE:         'CRIME/SECURITY',
  MEDICAL:        'MEDICAL/EMS',
  MILITARY:       'MILITARY/TACTICAL',
  SECURITY_FORCE: 'SECURITY',
};

const alertLabel = (agencyType) =>
  AGENCY_TO_ALERT[String(agencyType || '').toUpperCase()] ||
  String(agencyType || 'EMERGENCY').toUpperCase();

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

/* ─── Live ticker — forces re-render every second ────────────────────────── */
const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const elapsedStr = (assignedAt, now) => {
  const diff = Math.max(0, Math.floor((now - new Date(assignedAt)) / 1000));
  const mm = String(Math.floor(diff / 60)).padStart(2, '0');
  const ss = String(diff % 60).padStart(2, '0');
  return `${mm}:${ss}s`;
};

/* ─── Priority badge colour ──────────────────────────────────────────────── */
const priorityBadge = (priorityLevel) => {
  const normalized = String(priorityLevel || '').toUpperCase();
  if (normalized === 'CRITICAL') return { label: 'CRITICAL', cls: 'badge critical' };
  if (normalized === 'HIGH') return { label: 'HIGH', cls: 'badge high' };
  if (normalized === 'MEDIUM') return { label: 'MEDIUM', cls: 'badge medium' };
  return { label: 'LOW', cls: 'badge low' };
};

/* ─── Queue card ─────────────────────────────────────────────────────────── */
const QueueCard = ({ item, active, onClick, now }) => {
  const pb = priorityBadge(item.alert_priority_level);
  const incidentType = item.alert_type || alertLabel(item.agency?.agency_type);
  return (
    <div
      className={`queue-card${active ? ' active' : ''}`}
      onClick={() => onClick(item.assignment_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(item.assignment_id)}
    >
      <div className="queue-card-type">{incidentType}</div>
      <div className="queue-card-meta">
        <span>Active: </span>
        <span className="queue-card-timer">{elapsedStr(item.assigned_at, now)}</span>
      </div>
      <div className="queue-card-row">
        <span className={pb.cls} style={{ fontSize: 10 }}>Computed {pb.label}</span>
        <span className={`badge ${(item.notification_status || '').toLowerCase()}`}
              style={{ fontSize: 10 }}>
          {item.notification_status || 'PENDING'}
        </span>
      </div>
      <div className="queue-card-loc">
        {item.agency?.agency_name || '—'}
      </div>
    </div>
  );
};

/* ─── Map panel ──────────────────────────────────────────────────────────── */
const MapPanel = ({ locationData }) => {
  const mapSrc =
    locationData?.latitude && locationData?.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${locationData.longitude - 0.04},${locationData.latitude - 0.04},${locationData.longitude + 0.04},${locationData.latitude + 0.04}&layer=mapnik&marker=${locationData.latitude},${locationData.longitude}`
      : null;

  return (
    <div className="map-panel">
      <div className="map-header">
        <span className="map-title">Incident Location Map</span>
      </div>

      <div className="map-viewport">
        {mapSrc ? (
          <iframe src={mapSrc} title="Incident location map" />
        ) : (
          <div className="map-placeholder">
            <div className="map-placeholder-label">
              <div style={{ fontSize: 32, marginBottom: 8 }}>🗺</div>
              Select an incident to view on map
            </div>
          </div>
        )}
      </div>

      <div className="map-controls">
        <button className="map-ctrl-btn" title="Zoom in">+</button>
        <button className="map-ctrl-btn" title="Zoom out">−</button>
        <button className="map-ctrl-btn" title="Layers" style={{ fontSize: 12 }}>⊞</button>
        <button className="map-ctrl-btn" title="Fullscreen" style={{ fontSize: 11 }}>⛶</button>
      </div>
    </div>
  );
};

/* ─── Activity log ───────────────────────────────────────────────────────── */
const ActivityLog = ({ assignment }) => {
  if (!assignment) return null;

  const entries = [
    { actor: 'SYSTEM', msg: 'Alert assigned and notification dispatched', time: fmt(assignment.assigned_at) },
  ];

  if (assignment.assigned_at) {
    const t2 = new Date(new Date(assignment.assigned_at).getTime() + 2000).toISOString();
    entries.push({ actor: 'SYSTEM', msg: 'SMS sent to emergency contacts', time: fmt(t2) });
  }

  if (assignment.acknowledgment) {
    entries.push({
      actor: 'DISPATCHER',
      msg: `${assignment.acknowledgment.acknowledged_by} acknowledged — ETA ${assignment.acknowledgment.estimated_arrival ?? '?'} min`,
      time: fmt(assignment.acknowledgment.ack_timestamp),
    });
  }

  return (
    <div className="activity-log">
      <div className="activity-log-inner">
        {entries.map((e, i) => (
          <div key={i} className="activity-entry">
            <span className="actor">[{e.actor}]</span>
            {' : '}
            {e.msg}
            {e.time ? <span className="ts"> ({e.time})</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Acknowledgment section ─────────────────────────────────────────────── */
const AckSection = ({ assignment, assignmentId, submitting, onAcknowledged }) => {
  const ack = assignment?.acknowledgment;

  const [form, setForm] = useState({
    acknowledged_by: '',
    estimated_arrival: '',
    response_message: '',
    responder_contact: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.acknowledged_by.trim()) { setError('Acknowledged By is required.'); return; }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload = { acknowledged_by: form.acknowledged_by.trim() };
      if (form.estimated_arrival) payload.estimated_arrival = Number(form.estimated_arrival);
      if (form.response_message.trim()) payload.response_message = form.response_message.trim();
      if (form.responder_contact.trim()) payload.responder_contact = form.responder_contact.trim();
      await acknowledgeAssignment(assignmentId, payload);
      setSuccess('Acknowledgment submitted. Civilian has been notified.');
      onAcknowledged();
    } catch (err) {
      setError(parseApiError(err, 'Failed to acknowledge.'));
    } finally {
      setBusy(false);
    }
  };

  if (ack) {
    return (
      <div className="ack-details-card">
        <div className="ack-details-title">✓ Acknowledged</div>
        <div className="ack-row"><span>By</span><strong>{ack.acknowledged_by}</strong></div>
        <div className="ack-row"><span>At</span><strong>{fmt(ack.ack_timestamp)}</strong></div>
        {ack.estimated_arrival != null && (
          <div className="ack-row"><span>ETA</span><strong>{ack.estimated_arrival} min</strong></div>
        )}
        {ack.response_message && (
          <div className="ack-row"><span>Message</span><strong>{ack.response_message}</strong></div>
        )}
        {ack.responder_contact && (
          <div className="ack-row"><span>Contact</span><strong>{ack.responder_contact}</strong></div>
        )}
      </div>
    );
  }

  return (
    <form className="ack-form" onSubmit={handleSubmit}>
      <div className="ack-form-title">Acknowledge Alert</div>
      {error   ? <div className="inline-error">{error}</div>   : null}
      {success ? <div className="inline-success">{success}</div> : null}

      <div className="ack-field">
        <label htmlFor="ack_by">Acknowledged By *</label>
        <input
          id="ack_by"
          value={form.acknowledged_by}
          onChange={set('acknowledged_by')}
          placeholder="Officer / Dispatcher name"
          disabled={busy || submitting}
          required
        />
      </div>
      <div className="ack-row-fields">
        <div className="ack-field">
          <label htmlFor="ack_eta">ETA (minutes)</label>
          <input
            id="ack_eta"
            type="number"
            min="1"
            value={form.estimated_arrival}
            onChange={set('estimated_arrival')}
            placeholder="e.g. 15"
            disabled={busy || submitting}
          />
        </div>
        <div className="ack-field">
          <label htmlFor="ack_contact">Responder Contact</label>
          <input
            id="ack_contact"
            value={form.responder_contact}
            onChange={set('responder_contact')}
            placeholder="+2348012345678"
            disabled={busy || submitting}
          />
        </div>
      </div>
      <div className="ack-field">
        <label htmlFor="ack_msg">Response Message</label>
        <textarea
          id="ack_msg"
          value={form.response_message}
          onChange={set('response_message')}
          placeholder="We are responding to the incident."
          disabled={busy || submitting}
          rows={2}
        />
      </div>
      <button className="action-btn-primary" type="submit" disabled={busy || submitting}>
        {busy ? 'Submitting…' : '[ Acknowledge Alert ]'}
      </button>
    </form>
  );
};

/* ─── Main dashboard ─────────────────────────────────────────────────────── */
const DashboardPage = () => {
  const { user, logout } = useAuth();

  const [assignments, setAssignments]   = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [listError,   setListError]     = useState('');

  const [selectedId,    setSelectedId]    = useState(null);
  const [locationData,  setLocationData]  = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [statusBusy,   setStatusBusy]   = useState(false);
  const [statusMsg,    setStatusMsg]    = useState('');
  const [statusErr,    setStatusErr]    = useState('');

  const now = useNow();

  /* ── Load all assignments ── */
  const loadAssignments = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await fetchAgencyAssignments();
      const list = normalizeList(data);
      setAssignments(list);
      if (list.length && !selectedId) setSelectedId(list[0].assignment_id);
    } catch (err) {
      setListError(parseApiError(err, 'Failed to load alerts.'));
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadAssignments();
    const id = setInterval(loadAssignments, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── Load location when selection changes ── */
  useEffect(() => {
    if (!selectedId) { setLocationData(null); return; }
    setLoadingDetail(true);
    fetchAssignmentLocation(selectedId)
      .then(setLocationData)
      .catch(() => setLocationData(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const selected = assignments.find((a) => String(a.assignment_id) === String(selectedId)) || null;

  /* ── Status update ── */
  const handleStatus = async (nextStatus) => {
    if (!selectedId) return;
    setStatusBusy(true);
    setStatusMsg('');
    setStatusErr('');
    try {
      await updateAssignmentStatus(selectedId, nextStatus);
      setStatusMsg(`Status updated to ${nextStatus}.`);
      await loadAssignments();
    } catch (err) {
      setStatusErr(parseApiError(err, 'Status update failed.'));
    } finally {
      setStatusBusy(false);
    }
  };

  const pb = selected ? priorityBadge(selected.alert_priority_level) : null;

  /* ── Render ── */
  return (
    <div className="dashboard">

      {/* ══ LEFT — Incoming Queue ══ */}
      <aside className="queue-panel">
        <div className="queue-header">
          <div className="queue-header-left">
            <span className="queue-title">Incoming Queue</span>
            <button className="queue-dots" title="Options">···</button>
          </div>
          <span className="queue-count-badge">{assignments.length}</span>
        </div>

        <div className="queue-section-header">
          <span className="queue-section-title">Live Emergency</span>
          <span className="queue-section-count">{assignments.length}</span>
        </div>

        <div className="queue-list">
          {loadingList && assignments.length === 0 ? (
            <div className="queue-empty">Loading alerts…</div>
          ) : listError ? (
            <div className="queue-empty" style={{ color: '#ff6b6b' }}>{listError}</div>
          ) : assignments.length === 0 ? (
            <div className="queue-empty">No active alerts</div>
          ) : (
            assignments.map((item) => (
              <QueueCard
                key={item.assignment_id}
                item={item}
                active={String(item.assignment_id) === String(selectedId)}
                onClick={setSelectedId}
                now={now}
              />
            ))
          )}
        </div>
      </aside>

      {/* ══ CENTER — Map ══ */}
      <MapPanel locationData={locationData} />

      {/* ══ RIGHT — Command Console ══ */}
      <aside className="console-panel">
        <div className="console-header">
          <div className="console-header-row">
            <span className="console-title">
              {selected ? `Command Console: Assignment #${selected.assignment_id}` : 'Command Console'}
            </span>
            <button className="console-logout" onClick={logout}>Logout</button>
          </div>
          {selected && (
            <div className="console-agency-row">
              {selected.agency?.agency_name}
              {' · '}
              {user?.agency_name || ''}
            </div>
          )}
        </div>

        {!selected ? (
          <div className="console-empty">
            <div className="console-empty-icon">📡</div>
            <div className="console-empty-text">
              {loadingList ? 'Loading alerts…' : 'Select an alert from the queue'}
            </div>
          </div>
        ) : (
          <>
            <div className="console-body">

              {/* ── Assignment summary ── */}
              <div className="civilian-card">
                <div className="console-summary-row">
                  <div>
                    <div className="queue-card-type" style={{ fontSize: 12, marginBottom: 6 }}>
                      {alertLabel(selected.agency?.agency_type)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      Active: <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>
                        {elapsedStr(selected.assigned_at, now)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {pb && <span className={pb.cls}>{pb.label}</span>}
                    <span className={`badge ${(selected.notification_status || '').toLowerCase()}`}>
                      {selected.notification_status || 'PENDING'}
                    </span>
                  </div>
                </div>

                <div className="civilian-medical">
                  <div>
                    <div className="medical-item-label">Assignment</div>
                    <div className="medical-item-value" style={{ fontSize: 12 }}>#{selected.assignment_id}</div>
                  </div>
                  <div>
                    <div className="medical-item-label">Agency Type</div>
                    <div className="medical-item-value" style={{ fontSize: 11 }}>{selected.agency?.agency_type || '—'}</div>
                  </div>
                  <div>
                    <div className="medical-item-label">Phone</div>
                    <div className="medical-item-value" style={{ fontSize: 10 }}>{selected.agency?.contact_phone || '—'}</div>
                  </div>
                </div>
              </div>

              {/* ── Location ── */}
              {loadingDetail ? (
                <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
                  Loading location…
                </div>
              ) : locationData ? (
                <div className="civilian-card">
                  <div className="medical-item-label" style={{ marginBottom: 8 }}>📍 Incident Location</div>
                  {locationData.address && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                      {locationData.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
                    <span>Lat: {Number(locationData.latitude).toFixed(5)}</span>
                    <span>Lng: {Number(locationData.longitude).toFixed(5)}</span>
                    {locationData.accuracy && <span>Acc: {locationData.accuracy}m</span>}
                  </div>
                  {locationData.maps_url && (
                    <a
                      href={locationData.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginTop: 6, display: 'inline-block' }}
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
              ) : null}

              {/* ── Acknowledge / Ack details ── */}
              <AckSection
                assignment={selected}
                assignmentId={selectedId}
                submitting={statusBusy}
                onAcknowledged={loadAssignments}
              />

              {/* ── Status update ── */}
              <div className="console-actions">
                <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Update Alert Status
                </div>
                {statusErr ? <div className="inline-error">{statusErr}</div> : null}
                {statusMsg ? <div className="inline-success">{statusMsg}</div> : null}
                <button
                  className="action-btn-primary"
                  onClick={() => handleStatus('RESPONDING')}
                  disabled={statusBusy}
                >
                  [ Mark Responding ]
                </button>
                <button
                  className="action-btn-ghost"
                  onClick={() => handleStatus('RESOLVED')}
                  disabled={statusBusy}
                >
                  [ Mark Resolved ]
                </button>
              </div>

              {/* ── Activity log ── */}
              <ActivityLog assignment={selected} />

            </div>

          </>
        )}
      </aside>

    </div>
  );
};

export default DashboardPage;

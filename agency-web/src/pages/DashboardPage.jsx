import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Check, Bell, BellOff, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAgencyAssignments,
  fetchAssignmentLocation,
  acknowledgeAssignment,
  updateAssignmentStatus,
  registerWebPushSubscription,
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

const stripAnsi = (value) =>
  String(value || '').replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

const summarizeError = (value) => {
  const text = stripAnsi(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const dailyLimit = text.match(/exceeded the \d+ daily messages limit/i);
  if (dailyLimit) return `${dailyLimit[0]}.`;

  const unableCreate = text.match(/Unable to create record:[^.]+/i);
  if (unableCreate) return `${unableCreate[0]}.`;

  if (text.length > 180) return `${text.slice(0, 177)}...`;
  return text;
};

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

/* ─── Priority sort order ────────────────────────────────────────────────── */
const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/* ─── Timer urgency class ────────────────────────────────────────────────── */
const timerClass = (assignedAt, now) => {
  const diff = Math.max(0, Math.floor((now - new Date(assignedAt)) / 1000));
  if (diff > 600) return 'timer-danger';
  if (diff > 300) return 'timer-warn';
  return '';
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
  const alertStatus = (item.alert_status || '').toUpperCase();
  const isDone = alertStatus === 'RESOLVED' || alertStatus === 'CANCELLED';
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
        {isDone ? (
          <span className="queue-card-timer queue-card-done">{alertStatus}</span>
        ) : (
          <>
            <span>Active: </span>
            <span className={`queue-card-timer ${timerClass(item.assigned_at, now)}`}>
              {elapsedStr(item.assigned_at, now)}
            </span>
          </>
        )}
      </div>
      <div className="queue-card-row">
        <span className={pb.cls} style={{ fontSize: 10 }}>Computed {pb.label}</span>
        <span className={`badge ${alertStatus.toLowerCase()}`} style={{ fontSize: 10 }}>
          {alertStatus || 'PENDING'}
        </span>
      </div>
      <div className="queue-card-loc">
        {item.agency?.agency_name || '—'}
      </div>
    </div>
  );
};

/* ─── Map panel ──────────────────────────────────────────────────────────── */
const MapPanel = ({ locationData, loading }) => {
  const [bboxSpan, setBboxSpan] = useState(0.04);
  const viewportRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setBboxSpan(0.04);
  }, [locationData?.latitude, locationData?.longitude]);

  // Track fullscreen state for tooltip (A12 partial)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const mapSrc = useMemo(() => {
    if (!locationData?.latitude || !locationData?.longitude) return null;
    const lat = Number(locationData.latitude);
    const lng = Number(locationData.longitude);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bboxSpan},${lat - bboxSpan},${lng + bboxSpan},${lat + bboxSpan}&layer=mapnik&marker=${lat},${lng}`;
  }, [locationData?.latitude, locationData?.longitude, bboxSpan]);

  const handleZoomIn = () => setBboxSpan((prev) => Math.max(0.005, prev * 0.75));
  const handleZoomOut = () => setBboxSpan((prev) => Math.min(0.5, prev * 1.25));

  const handleFullscreen = () => {
    const target = viewportRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      target.requestFullscreen?.();
    }
  };

  return (
    <div className="map-panel">
      <div className="map-header">
        <span className="map-title">Incident Location Map</span>
      </div>

      <div className="map-viewport" ref={viewportRef}>
        {/* A11 — loading state while fetching location */}
        {loading ? (
          <div className="map-placeholder">
            <div className="map-placeholder-label">
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading location…</div>
            </div>
          </div>
        ) : mapSrc ? (
          <iframe src={mapSrc} title="Incident location map" />
        ) : (
          <div className="map-placeholder">
            <div className="map-placeholder-label">
              <div style={{ fontSize: 20, marginBottom: 8, fontWeight: 700 }}>MAP</div>
              Select an incident to view on map
            </div>
          </div>
        )}
      </div>

      <div className="map-controls">
        <button className="map-ctrl-btn" title="Zoom in" onClick={handleZoomIn} disabled={!mapSrc}>+</button>
        <button className="map-ctrl-btn" title="Zoom out" onClick={handleZoomOut} disabled={!mapSrc}>-</button>
        {/* A12 partial — tooltip changes between enter/exit */}
        <button
          className="map-ctrl-btn"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          style={{ fontSize: 9 }}
          onClick={handleFullscreen}
          disabled={!mapSrc}
        >
          ⛶
        </button>
      </div>
    </div>
  );
};

const ActivityLog = ({ assignment, notes = [] }) => {
  if (!assignment) return null;

  let seq = 0;
  const entries = [];
  entries.push({
    actor: 'SYSTEM',
    msg: 'Alert assigned and notification dispatch started',
    ts: assignment.assigned_at,
    seq: seq++,
  });

  const deliveryLogs = [...(assignment.notification_logs || [])]
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  deliveryLogs.forEach((log) => {
    const retryText = (log.retry_count ?? 0) > 0 ? ` (retry ${log.retry_count})` : '';
    const cleanedError = summarizeError(log.error_message);
    const errorText = cleanedError ? ` — ${cleanedError}` : '';
    entries.push({
      actor: 'SYSTEM',
      msg: `${log.channel_type} ${log.delivery_status}${retryText}${errorText}`,
      ts: log.sent_at,
      seq: seq++,
    });
  });

  if (assignment.acknowledgment) {
    entries.push({
      actor: 'DISPATCHER',
      msg: `${assignment.acknowledgment.acknowledged_by} acknowledged — ETA ${assignment.acknowledgment.estimated_arrival ?? '?'} min`,
      ts: assignment.acknowledgment.ack_timestamp,
      seq: seq++,
    });
  }

  const status = String(assignment.alert_status || '').toUpperCase();
  if (status === 'RESPONDING') {
    entries.push({
      actor: 'SYSTEM',
      msg: 'Assignment status updated to RESPONDING',
      ts: assignment.alert_updated_at || assignment.response_time || null,
      seq: seq++,
    });
  } else if (status === 'RESOLVED') {
    entries.push({
      actor: 'SYSTEM',
      msg: 'Assignment status updated to RESOLVED',
      ts: assignment.alert_updated_at || assignment.response_time || null,
      seq: seq++,
    });
  } else if (status === 'CANCELLED') {
    entries.push({
      actor: 'SYSTEM',
      msg: 'Alert was cancelled by civilian',
      ts: assignment.alert_updated_at || null,
      seq: seq++,
    });
  }

  const noteEntries = notes.map((n) => ({
    actor: 'DISPATCHER',
    msg: n.text,
    ts: n.timestamp || null,
    fallbackTime: n.time || '',
    seq: seq++,
  }));

  const allEntries = [
    ...entries,
    ...noteEntries,
  ].sort((a, b) => {
    const ta = a.ts ? new Date(a.ts).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.ts ? new Date(b.ts).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.seq ?? 0) - (b.seq ?? 0);
  });

  return (
    <div className="activity-log">
      <div className="activity-log-header">Activity Log</div>
      <div className="activity-log-inner">
        {allEntries.map((e, i) => (
          <div key={i} className="activity-entry">
            <span className={`actor ${e.actor === 'DISPATCHER' ? 'actor-dispatcher' : ''}`}>[{e.actor}]</span>
            {' : '}
            {e.msg}
            {(e.ts || e.fallbackTime) ? (
              <span className="ts"> ({e.ts ? fmt(e.ts) : e.fallbackTime})</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Acknowledgment section ─────────────────────────────────────────────── */
/* A8 — draft preservation: form state survives card-switching via initialDraft/onDraftChange */
const AckSection = ({
  assignment,
  assignmentId,
  submitting,
  onAcknowledged,
  nowMs,
  currentUser,
  initialDraft,
  onDraftChange,
}) => {
  const ack = assignment?.acknowledgment;

  const [form, setForm] = useState(() => ({
    acknowledged_by: initialDraft?.acknowledged_by ?? currentUser?.full_name ?? '',
    estimated_arrival: initialDraft?.estimated_arrival ?? '',
    response_message: initialDraft?.response_message ?? '',
    responder_contact: initialDraft?.responder_contact ?? currentUser?.phone_number ?? '',
  }));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  // Persist draft on every form change (A8)
  useEffect(() => {
    if (!ack) onDraftChange?.(form);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const etaCountdown = useMemo(() => {
    if (!ack?.ack_timestamp) return null;
    const etaMinutes = Number(ack?.estimated_arrival);
    if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) return null;

    const etaAtMs = new Date(ack.ack_timestamp).getTime() + (etaMinutes * 60 * 1000);
    const remainingSecs = Math.max(0, Math.ceil((etaAtMs - nowMs) / 1000));
    const mm = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
    const ss = String(remainingSecs % 60).padStart(2, '0');
    return remainingSecs > 0 ? `${mm}:${ss}` : 'Arrived / Overdue';
  }, [ack?.ack_timestamp, ack?.estimated_arrival, nowMs]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      onDraftChange?.(null); // clear draft after success
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
        <div className="ack-details-title"><Check size={14} strokeWidth={2.5} /> Acknowledged</div>
        <div className="ack-row"><span>By</span><strong>{ack.acknowledged_by}</strong></div>
        <div className="ack-row"><span>At</span><strong>{fmt(ack.ack_timestamp)}</strong></div>
        {ack.estimated_arrival != null && (
          <div className="ack-row"><span>ETA</span><strong>{ack.estimated_arrival} min</strong></div>
        )}
        {etaCountdown && (
          <div className="ack-row"><span>ETA Countdown</span><strong>{etaCountdown}</strong></div>
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
        <label htmlFor="ack_by">Acknowledged By</label>
        <input
          id="ack_by"
          value={form.acknowledged_by}
          onChange={set('acknowledged_by')}
          placeholder="Officer / Dispatcher name"
          disabled={busy || submitting}
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

/* ─── Alert sound (Web Audio API — no file needed) ───────────────────────── */
const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (startTime, freq = 880, dur = 0.14) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };
    beep(ctx.currentTime);
    beep(ctx.currentTime + 0.18);
    beep(ctx.currentTime + 0.36);
  } catch { /* audio unavailable */ }
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

  const [newAlertToast, setNewAlertToast] = useState(0);
  const prevIdsRef     = useRef(null);
  const toastTimerRef  = useRef(null);

  const [soundEnabled, setSoundEnabled]     = useState(true);
  const soundEnabledRef = useRef(true);
  const [lastSyncedAt, setLastSyncedAt]     = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [activeTab, setActiveTab]           = useState('active');
  const [copyMsg, setCopyMsg]               = useState('');

  // A2 — notes: persisted to localStorage, synced across tabs via storage event
  const [notesMap, setNotesMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lg_agency_notes') || '{}'); } catch { return {}; }
  });
  const [noteText, setNoteText] = useState('');

  // A3 — debounced queue search
  const [searchInput, setSearchInput]   = useState('');
  const [queueSearch, setQueueSearch]   = useState('');
  const searchDebounceRef               = useRef(null);

  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [throttledUntil, setThrottledUntil] = useState(null);
  const throttledUntilRef = useRef(null);

  // A8 — draft ack form data persisted across card switches (keyed by assignmentId)
  const ackDraftsRef = useRef({});

  useEffect(() => { throttledUntilRef.current = throttledUntil; }, [throttledUntil]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Persist dispatcher notes to localStorage
  useEffect(() => {
    localStorage.setItem('lg_agency_notes', JSON.stringify(notesMap));
  }, [notesMap]);

  // A2 — sync notes across tabs when another tab writes to localStorage
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'lg_agency_notes' && e.newValue) {
        try { setNotesMap(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // A3 — debounce search: update queueSearch 300ms after last keystroke
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setQueueSearch(val), 300);
  };

  // Browser tab: show active alert count
  useEffect(() => {
    const count = assignments.filter(
      (a) => !['RESOLVED', 'CANCELLED'].includes((a.alert_status || '').toUpperCase())
    ).length;
    document.title = count > 0 ? `(${count}) LiveGuard Dispatch` : 'LiveGuard Dispatch';
    return () => { document.title = 'LiveGuard Dispatch'; };
  }, [assignments]);

  // Reset per-card transient states when switching cards
  useEffect(() => {
    setResolveConfirm(false);
    setStatusMsg('');
    setStatusErr('');
    setCopyMsg('');
  }, [selectedId]);

  const now = useNow();

  /* ── Load all assignments ── */
  const loadAssignments = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const data = await fetchAgencyAssignments();
      const list = normalizeList(data);

      // Detect new assignments on every poll after the first load
      if (prevIdsRef.current !== null) {
        const incoming = list.filter((a) => !prevIdsRef.current.has(a.assignment_id));
        if (incoming.length > 0) {
          if (soundEnabledRef.current) playAlertSound();
          setNewAlertToast(incoming.length);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setNewAlertToast(0), 4000);
        }
      }
      prevIdsRef.current = new Set(list.map((a) => a.assignment_id));

      setAssignments(list);
      setLastSyncedAt(Date.now());

      // A4 — auto-deselect if selected item no longer exists in the refreshed list
      setSelectedId((prev) => {
        if (!prev) return list[0]?.assignment_id ?? null;
        if (list.some((a) => String(a.assignment_id) === String(prev))) return prev;
        return list[0]?.assignment_id ?? null;
      });
    } catch (err) {
      if (err?.response?.status === 429) {
        const ra = err?.response?.headers?.['retry-after'];
        let secs = ra ? parseInt(ra, 10) : NaN;
        if (isNaN(secs)) {
          const match = String(err?.response?.data?.detail || '').match(/(\d+)\s+second/);
          secs = match ? parseInt(match[1], 10) : 60;
        }
        setThrottledUntil(Date.now() + secs * 1000);
        setListError('');
      } else {
        setListError(parseApiError(err, 'Failed to load alerts.'));
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadAssignmentsRef = useRef(loadAssignments);
  useEffect(() => { loadAssignmentsRef.current = loadAssignments; }, [loadAssignments]);

  useEffect(() => {
    loadAssignmentsRef.current();
    const id = setInterval(() => {
      if (throttledUntilRef.current && Date.now() < throttledUntilRef.current) return;
      loadAssignmentsRef.current();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── Register browser Web Push subscription ── */
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => Notification.requestPermission().then((perm) => ({ reg, perm })))
      .then(({ reg, perm }) => {
        if (perm !== 'granted') return;
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      })
      .then((subscription) => {
        if (!subscription) return;
        return registerWebPushSubscription(subscription.toJSON());
      })
      .catch(() => {});
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
      if (nextStatus === 'RESOLVED') setActiveTab('resolved');
    } catch (err) {
      setStatusErr(parseApiError(err, 'Status update failed.'));
    } finally {
      setStatusBusy(false);
    }
  };

  const pb          = selected ? priorityBadge(selected.alert_priority_level) : null;
  const alertStatus = selected ? (selected.alert_status || '').toUpperCase() : '';

  const syncedSecsAgo    = lastSyncedAt ? Math.floor((now - lastSyncedAt) / 1000) : null;
  const connectionOk     = syncedSecsAgo !== null && syncedSecsAgo < 15;
  const throttleSecsLeft = throttledUntil ? Math.max(0, Math.ceil((throttledUntil - now) / 1000)) : 0;

  const displayedAssignments = useMemo(() => {
    let list = [...assignments];
    if (activeTab === 'resolved') {
      list = list.filter((a) => ['RESOLVED', 'CANCELLED'].includes((a.alert_status || '').toUpperCase()));
    } else {
      list = list.filter((a) => !['RESOLVED', 'CANCELLED'].includes((a.alert_status || '').toUpperCase()));
    }
    if (priorityFilter !== 'ALL') {
      list = list.filter((a) => (a.alert_priority_level || '').toUpperCase() === priorityFilter);
    }
    if (queueSearch.trim()) {
      const term = queueSearch.trim().toLowerCase();
      list = list.filter((a) =>
        [String(a.assignment_id), a.alert_type, a.alert_status, a.reporter_name, a.agency?.agency_name]
          .filter(Boolean).join(' ').toLowerCase().includes(term)
      );
    }
    list.sort((a, b) => {
      const pa = PRIORITY_ORDER[String(a.alert_priority_level || '').toUpperCase()] ?? 99;
      const pb = PRIORITY_ORDER[String(b.alert_priority_level || '').toUpperCase()] ?? 99;
      return pa - pb;
    });
    return list;
  }, [assignments, activeTab, priorityFilter, queueSearch]);

  // Keyboard arrow-key navigation through queue
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const idx = displayedAssignments.findIndex((a) => String(a.assignment_id) === String(selectedId));
      if (e.key === 'ArrowDown' && idx < displayedAssignments.length - 1) {
        setSelectedId(displayedAssignments[idx + 1].assignment_id);
      } else if (e.key === 'ArrowUp' && idx > 0) {
        setSelectedId(displayedAssignments[idx - 1].assignment_id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayedAssignments, selectedId]);

  const copyCoords = () => {
    if (!locationData?.latitude) return;
    const text = `${Number(locationData.latitude).toFixed(6)}, ${Number(locationData.longitude).toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    }).catch(() => {});
  };

  const addNote = () => {
    if (!noteText.trim() || !selectedId) return;
    const entry = { text: noteText.trim(), timestamp: new Date().toISOString() };
    setNotesMap((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), entry],
    }));
    setNoteText('');
  };

  /* ── Render ── */
  return (
    <div className="dashboard">

      {newAlertToast > 0 && (
        <div className="new-alert-toast">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          {newAlertToast === 1 ? 'New emergency alert incoming' : `${newAlertToast} new emergency alerts incoming`}
        </div>
      )}

      {/* ══ LEFT — Incoming Queue ══ */}
      <aside className="queue-panel">
        <div className="queue-header">
          <div className="queue-header-left">
            <span className="queue-title">Incoming Queue</span>
            <span className={`conn-dot ${connectionOk ? 'conn-ok' : 'conn-stale'}`} title={syncedSecsAgo !== null ? `Last synced ${syncedSecsAgo}s ago` : 'Connecting…'} />
          </div>
          <div className="queue-header-right">
            {/* A5 — add aria-label to icon-only sound toggle */}
            <button
              className={`sound-toggle ${soundEnabled ? 'on' : 'off'}`}
              title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
              aria-label={soundEnabled ? 'Mute alert sound' : 'Unmute alert sound'}
              onClick={() => setSoundEnabled((v) => !v)}
            >
              {soundEnabled ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
            {/* A13 — show total count alongside filtered count */}
            <span
              className="queue-count-badge"
              title={
                displayedAssignments.length !== assignments.length
                  ? `${displayedAssignments.length} shown / ${assignments.length} total`
                  : `${assignments.length} total`
              }
            >
              {displayedAssignments.length}
              {displayedAssignments.length !== assignments.length && (
                <span style={{ opacity: 0.7, fontWeight: 400 }}>/{assignments.length}</span>
              )}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="queue-tabs">
          <button className={`queue-tab${activeTab === 'active' ? ' active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
          <button className={`queue-tab${activeTab === 'resolved' ? ' active' : ''}`} onClick={() => setActiveTab('resolved')}>Resolved</button>
        </div>

        {/* Priority filter */}
        <div className="queue-filters">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <button
              key={p}
              className={`queue-filter-btn${priorityFilter === p ? ' active' : ''} ${p.toLowerCase()}`}
              onClick={() => setPriorityFilter(p)}
            >
              {p === 'ALL' ? 'All' : p}
            </button>
          ))}
        </div>

        {/* A3 — debounced search via searchInput/queueSearch split */}
        <div className="queue-search-wrap">
          <input
            className="queue-search-input"
            type="search"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search queue by ID, type, status, reporter…"
          />
        </div>

        <div className="queue-list">
          {throttleSecsLeft > 0 ? (
            <div className="queue-throttle-notice">
              <div className="queue-throttle-title">Rate limited</div>
              <div className="queue-throttle-sub">Resuming in {throttleSecsLeft}s…</div>
            </div>
          ) : loadingList && assignments.length === 0 ? (
            <div className="queue-empty">Loading alerts…</div>
          ) : listError ? (
            <div className="queue-empty" style={{ color: '#ff6b6b' }}>{listError}</div>
          ) : displayedAssignments.length === 0 ? (
            <div className="queue-empty">
              {activeTab === 'resolved' ? 'No resolved alerts' : 'No active alerts'}
            </div>
          ) : (
            displayedAssignments.map((item) => (
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
      <MapPanel locationData={locationData} loading={loadingDetail} />

      {/* ══ RIGHT — Command Console ══ */}
      <aside className="console-panel">
        <div className="console-header">
          <div className="console-header-row">
            <span className="console-title">
              {selected ? `Command Console: Assignment #${selected.assignment_id}` : 'Command Console'}
            </span>
            <button className="console-logout" onClick={logout} title="Logout"><LogOut size={15} /></button>
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
            <div className="console-empty-icon"><Radio size={32} /></div>
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
                    <div className="queue-card-type" style={{ fontSize: 12, marginBottom: 4 }}>
                      {alertLabel(selected.agency?.agency_type)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      Assignment <strong style={{ color: 'var(--text-1)' }}>#{selected.assignment_id}</strong>
                      {' · '}
                      {['RESOLVED', 'CANCELLED'].includes((selected.alert_status || '').toUpperCase())
                        ? <span style={{ color: 'var(--text-3)' }}>{selected.alert_status}</span>
                        : <>Active: <strong style={{ color: 'var(--text-1)' }}>{elapsedStr(selected.assigned_at, now)}</strong></>
                      }
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {pb && <span className={pb.cls}>{pb.label}</span>}
                    <span className={`badge ${(selected.alert_status || '').toLowerCase()}`}>
                      {selected.alert_status || 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Reporter info */}
                <div className="reporter-section">
                  <div className="reporter-row">
                    <div className="medical-item-label">Reporter</div>
                    <div className="reporter-name">{selected.reporter_name || '—'}</div>
                  </div>
                  <div className="reporter-row">
                    <div className="medical-item-label">Phone</div>
                    {selected.reporter_phone
                      ? <a className="reporter-phone" href={`tel:${selected.reporter_phone}`}>{selected.reporter_phone}</a>
                      : <div className="reporter-phone muted">—</div>
                    }
                  </div>
                </div>

                {selected.alert_description && (
                  <div className="alert-description-box">
                    <div className="medical-item-label" style={{ marginBottom: 4 }}>Description</div>
                    <div className="alert-description-text">{selected.alert_description}</div>
                  </div>
                )}
              </div>

              {/* ── Location ── */}
              {locationData ? (
                <div className="civilian-card">
                  <div className="medical-item-label" style={{ marginBottom: 8 }}>📍 Incident Location</div>
                  {locationData.address && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                      {locationData.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)', alignItems: 'center' }}>
                    <span>Lat: {Number(locationData.latitude).toFixed(5)}</span>
                    <span>Lng: {Number(locationData.longitude).toFixed(5)}</span>
                    {locationData.accuracy && <span>Acc: {locationData.accuracy}m</span>}
                    <button className="copy-coords-btn" onClick={copyCoords} title="Copy coordinates">
                      {copyMsg || 'Copy'}
                    </button>
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
                key={selectedId}
                assignment={selected}
                assignmentId={selectedId}
                submitting={statusBusy}
                onAcknowledged={loadAssignments}
                nowMs={now}
                currentUser={user}
                initialDraft={ackDraftsRef.current[selectedId]}
                onDraftChange={(draft) => {
                  if (draft === null) {
                    delete ackDraftsRef.current[selectedId];
                  } else {
                    ackDraftsRef.current[selectedId] = draft;
                  }
                }}
              />

              {/* ── Response flow ── */}
              <div className="console-actions">
                <div className="flow-title">Response Flow</div>
                {statusErr ? <div className="inline-error">{statusErr}</div> : null}
                {statusMsg ? <div className="inline-success">{statusMsg}</div> : null}

                <div className="flow-steps">
                  {/* Step 1 — Acknowledge */}
                  <div className={`flow-step ${selected.acknowledgment ? 'flow-done' : 'flow-active'}`}>
                    <div className="flow-step-dot">{selected.acknowledgment ? <Check size={12} /> : '1'}</div>
                    <div className="flow-step-body">
                      <div className="flow-step-name">Acknowledge</div>
                      <div className="flow-step-sub">
                        {selected.acknowledgment
                          ? `By ${selected.acknowledgment.acknowledged_by}`
                          : 'Fill the acknowledgment form above'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 — Responding */}
                  {(() => {
                    const isRespondingDone = alertStatus === 'RESPONDING' || alertStatus === 'RESOLVED';
                    const canRespond = !!selected.acknowledgment && !isRespondingDone;
                    const stepCls = isRespondingDone ? 'flow-done' : canRespond ? 'flow-active' : 'flow-locked';
                    return (
                      <div className={`flow-step ${stepCls}`}>
                        <div className="flow-step-dot">{isRespondingDone ? <Check size={12} /> : '2'}</div>
                        <div className="flow-step-body">
                          <div className="flow-step-name">Responding</div>
                          {canRespond ? (
                            <button className="flow-action-btn" onClick={() => handleStatus('RESPONDING')} disabled={statusBusy}>
                              {statusBusy ? 'Updating…' : 'Mark as Responding'}
                            </button>
                          ) : (
                            <div className="flow-step-sub">
                              {isRespondingDone ? 'Dispatched to scene' : 'Requires acknowledgment first'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step 3 — Resolved */}
                  {(() => {
                    const canResolve = alertStatus === 'RESPONDING';
                    const isResolved = alertStatus === 'RESOLVED';
                    const stepCls = isResolved ? 'flow-done' : canResolve ? 'flow-active' : 'flow-locked';
                    return (
                      <div className={`flow-step ${stepCls}`}>
                        <div className="flow-step-dot">{isResolved ? <Check size={12} /> : '3'}</div>
                        <div className="flow-step-body">
                          <div className="flow-step-name">Resolved</div>
                          {canResolve ? (
                            resolveConfirm ? (
                              <div className="resolve-confirm-box">
                                <div className="flow-step-sub">Confirm resolution? This action closes the incident.</div>
                                <div className="resolve-confirm-actions">
                                  <button className="flow-action-btn secondary" onClick={() => handleStatus('RESOLVED')} disabled={statusBusy}>
                                    {statusBusy ? 'Updating…' : 'Confirm Resolve'}
                                  </button>
                                  <button className="flow-action-btn ghost" onClick={() => setResolveConfirm(false)} disabled={statusBusy}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button className="flow-action-btn secondary" onClick={() => setResolveConfirm(true)} disabled={statusBusy}>
                                Mark as Resolved
                              </button>
                            )
                          ) : (
                            <div className="flow-step-sub">
                              {isResolved ? 'Alert closed' : 'Requires responding status first'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── Activity log ── */}
              <ActivityLog assignment={selected} notes={notesMap[selectedId] || []} />

              {/* ── Dispatcher notes ── */}
              <div className="notes-section">
                <div className="notes-label">Add Note</div>
                <div className="notes-input-row">
                  <input
                    className="notes-input"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="e.g. Dispatched unit 4, ETA confirmed…"
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  />
                  <button className="notes-add-btn" onClick={addNote} disabled={!noteText.trim()}>Add</button>
                </div>
              </div>

            </div>

          </>
        )}
      </aside>

    </div>
  );
};

export default DashboardPage;

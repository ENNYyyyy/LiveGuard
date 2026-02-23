export const EMERGENCY_TYPES = [
  { key: 'TERRORISM',     label: 'Terrorism' },
  { key: 'BANDITRY',      label: 'Banditry' },
  { key: 'KIDNAPPING',    label: 'Kidnapping' },
  { key: 'ARMED_ROBBERY', label: 'Armed Robbery' },
  { key: 'ROBBERY',       label: 'Robbery' },
  { key: 'FIRE_INCIDENCE', label: 'Fire Incidence' },
  { key: 'ACCIDENT',      label: 'Accident' },
  { key: 'OTHER',         label: 'Other' },
];

export const PRIORITY_LEVELS = [
  { key: 'CRITICAL', label: 'Critical / Urgent' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
  { key: 'LOW', label: 'Low' },
];

export const ALERT_STATUSES = {
  PENDING:      { label: 'Pending',      color: '#F59E0B', bgColor: '#FEF3C7' },
  DISPATCHED:   { label: 'Dispatched',   color: '#3B82F6', bgColor: '#DBEAFE' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#8B5CF6', bgColor: '#EDE9FE' },
  RESPONDING:   { label: 'En Route',     color: '#16A34A', bgColor: '#D1FAE5' },
  RESOLVED:     { label: 'Resolved',     color: '#6B7280', bgColor: '#6B7280' },
  CANCELLED:    { label: 'Cancelled',    color: '#EF4444', bgColor: '#FEE2E2' },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN:      '@liveguard_auth_token',
  REFRESH_TOKEN:   '@liveguard_refresh_token',
  USER_PROFILE:    '@liveguard_user_profile',
  ONBOARDING_SEEN: '@liveguard_onboarding_seen',
};

export const INCIDENT_TYPE_ICONS = {
  TERRORISM:     { bgColor: '#7F1D1D', icon: 'alert-circle' },
  BANDITRY:      { bgColor: '#78350F', icon: 'alert' },
  KIDNAPPING:    { bgColor: '#1B1464', icon: 'alert' },
  ARMED_ROBBERY: { bgColor: '#1E1B4B', icon: 'shield' },
  ROBBERY:       { bgColor: '#2563EB', icon: 'shield' },
  FIRE_INCIDENCE: { bgColor: '#DC2626', icon: 'flame' },
  ACCIDENT:      { bgColor: '#0EA5E9', icon: 'ambulance' },
  OTHER:         { bgColor: '#374151', icon: 'help-circle' },
};

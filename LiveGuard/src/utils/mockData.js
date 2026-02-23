// ─── Mock Data ────────────────────────────────────────────────────────────────
// Toggle USE_MOCK in config.js to seed the Redux store with this data.
// Set USE_MOCK: false before production build.

export const mockAuth = {
  user: {
    id: 1,
    first_name: 'Nifemi',
    last_name: 'Oladoye',
    email: 'nifemi@example.com',
    phone_number: '+2348012345678',
    avatar: null,
  },
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  isAuthenticated: true,
  loading: false,
  error: null,
};

export const mockLocation = {
  latitude: 6.5244,
  longitude: 3.3792,
  accuracy: 10,
  address: '14 Bode Thomas St, Surulere, Lagos',
  isTracking: false,
  permissionGranted: true,
  permissionStatus: 'granted',
  locationError: null,
  loading: false,
  error: null,
};

const now = new Date();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();

export const mockAlert = {
  currentAlert: {
    id: 'ALT-001',
    alert_type: 'SOS',
    status: 'active',
    latitude: 6.5244,
    longitude: 3.3792,
    address: '14 Bode Thomas St, Surulere, Lagos',
    created_at: hoursAgo(0.5),
    responder: {
      name: 'Officer James',
      eta: '5 min',
      phone: '+2348099887766',
    },
  },
  alertHistory: [
    {
      id: 'ALT-001',
      alert_type: 'SOS',
      status: 'resolved',
      address: '14 Bode Thomas St, Surulere, Lagos',
      created_at: hoursAgo(24),
      resolved_at: hoursAgo(23),
    },
    {
      id: 'ALT-002',
      alert_type: 'Medical',
      status: 'resolved',
      address: '5 Allen Ave, Ikeja, Lagos',
      created_at: hoursAgo(72),
      resolved_at: hoursAgo(71),
    },
    {
      id: 'ALT-003',
      alert_type: 'Fire',
      status: 'cancelled',
      address: '22 Admiralty Way, Lekki, Lagos',
      created_at: hoursAgo(168),
      resolved_at: null,
    },
  ],
  alertStatus: 'active',
  submitting: false,
  loading: false,
  error: null,
};

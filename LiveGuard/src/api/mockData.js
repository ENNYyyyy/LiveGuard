// Use these to test screens before backend is ready

export const MOCK_USER = {
  user_id: 1,
  first_name: 'Toni',
  last_name: 'Madueke',
  full_name: 'Toni Madueke',
  email: 'example123@gmail.com',
  phone_number: '+2348012345678',
  emergency_contact_name: null,
  emergency_contact_phone: null,
};

export const MOCK_LOGIN_RESPONSE = {
  access: 'mock-access-token-xxx',
  refresh: 'mock-refresh-token-xxx',
  user: MOCK_USER,
};

export const MOCK_ALERT_RESPONSE = {
  alert_id: 101,
  alert_type: 'ROBBERY',
  priority_level: 'CRITICAL',
  description: null,
  status: 'DISPATCHED',
  created_at: new Date().toISOString(),
  location: {
    latitude: 6.6018,
    longitude: 3.3515,
    accuracy: 10.5,
    address: '213 West st. rose houses, Ikeja GRA, Nigeria',
  },
  assignments: [
    {
      assignment_id: 1,
      agency: { agency_name: 'Nigerian Police Force', agency_type: 'POLICE', contact_phone: '+2348012345678' },
      notification_status: 'SENT',
      acknowledgment: null,
    },
  ],
};

export const MOCK_ALERT_STATUS_ACKNOWLEDGED = {
  ...MOCK_ALERT_RESPONSE,
  status: 'RESPONDING',
  assignments: [
    {
      ...MOCK_ALERT_RESPONSE.assignments[0],
      notification_status: 'DELIVERED',
      acknowledgment: {
        ack_id: 1,
        acknowledged_by: 'Officer Adebayo',
        ack_timestamp: new Date(Date.now() - 60000).toISOString(),
        estimated_arrival: 4,
        response_message: 'Unit dispatched to your location',
        responder_contact: '+2348099999999',
      },
    },
  ],
};

export const MOCK_ALERT_HISTORY = [
  { alert_id: 100, alert_type: 'FIRE_INCIDENCE', priority_level: 'CRITICAL', status: 'RESOLVED',
    created_at: '2026-02-18T09:00:00Z', location: { address: 'Allen Avenue, Ikeja' } },
  { alert_id: 99,  alert_type: 'ROBBERY',        priority_level: 'HIGH',     status: 'RESOLVED',
    created_at: '2026-02-15T14:30:00Z', location: { address: 'Opebi Road, Lagos' } },
  { alert_id: 98,  alert_type: 'ACCIDENT',        priority_level: 'CRITICAL', status: 'RESOLVED',
    created_at: '2026-02-10T07:45:00Z', location: { address: 'Alausa, Ikeja' } },
  { alert_id: 97,  alert_type: 'ROBBERY',        priority_level: 'MEDIUM',   status: 'RESOLVED',
    created_at: '2026-02-05T20:00:00Z', location: { address: 'Agege, Lagos' } },
  { alert_id: 96,  alert_type: 'ACCIDENT',        priority_level: 'HIGH',     status: 'RESOLVED',
    created_at: '2026-01-28T11:15:00Z', location: { address: 'Shogunle, Lagos' } },
];

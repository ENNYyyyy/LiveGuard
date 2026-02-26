import client from './client';

export const fetchDashboard = async () => {
  const response = await client.get('/api/admin/dashboard/');
  return response.data;
};

export const fetchAgencies = async () => {
  const response = await client.get('/api/admin/agencies/');
  return response.data;
};

export const createAgency = async (data) => {
  const response = await client.post('/api/admin/agencies/', data);
  return response.data;
};

export const fetchAgency = async (agencyId) => {
  const response = await client.get(`/api/admin/agencies/${agencyId}/`);
  return response.data;
};

export const updateAgency = async (agencyId, data) => {
  const response = await client.put(`/api/admin/agencies/${agencyId}/`, data);
  return response.data;
};

export const patchAgency = async (agencyId, data) => {
  const response = await client.patch(`/api/admin/agencies/${agencyId}/`, data);
  return response.data;
};

export const deleteAgency = async (agencyId) => {
  const response = await client.delete(`/api/admin/agencies/${agencyId}/`);
  return response.data;
};

export const fetchAlerts = async ({ status, type, priority } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (type) params.type = type;
  if (priority) params.priority = priority;
  const response = await client.get('/api/admin/alerts/', { params });
  return response.data;
};

export const fetchAlert = async (alertId) => {
  const response = await client.get(`/api/admin/alerts/${alertId}/`);
  return response.data;
};

export const assignAlert = async (alertId, agencyId) => {
  const response = await client.post(`/api/admin/alerts/${alertId}/assign/`, {
    agency_id: agencyId,
  });
  return response.data;
};

export const fetchUsers = async () => {
  const response = await client.get('/api/admin/users/');
  return response.data;
};

export const toggleUserActive = async (userId, isActive) => {
  const response = await client.patch(`/api/admin/users/${userId}/`, { is_active: isActive });
  return response.data;
};

export const fetchNotifications = async ({ channel, status, assignment } = {}) => {
  const params = {};
  if (channel) params.channel = channel;
  if (status) params.status = status;
  if (assignment) params.assignment = assignment;
  const response = await client.get('/api/admin/notifications/', { params });
  return response.data;
};

export const fetchReports = async () => {
  const response = await client.get('/api/admin/reports/');
  return response.data;
};

export const fetchSettings = async () => {
  const response = await client.get('/api/admin/settings/');
  return response.data;
};

export const updateSettings = async (data) => {
  const response = await client.patch('/api/admin/settings/', data);
  return response.data;
};

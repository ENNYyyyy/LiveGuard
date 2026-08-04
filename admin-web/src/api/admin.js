import client from './client';

export const fetchDashboard = async ({ dateRange } = {}) => {
  const params = {};
  if (dateRange && dateRange !== 'all') params.date_range = dateRange;
  const response = await client.get('/api/admin/dashboard/', { params });
  return response.data;
};

export const broadcastNotification = async ({ title, message, channel }) => {
  const response = await client.post('/api/admin/notifications/broadcast/', { title, message, channel });
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

export const createAgencyStaff = async (agencyId, data) => {
  const response = await client.post(`/api/admin/agencies/${agencyId}/staff/`, data);
  return response.data;
};

export const removeAgencyStaff = async (agencyId, userId) => {
  const response = await client.delete(`/api/admin/agencies/${agencyId}/staff/${userId}/`);
  return response.data;
};

export const updateAgencyStaff = async (agencyId, userId, data) => {
  const response = await client.patch(`/api/admin/agencies/${agencyId}/staff/${userId}/`, data);
  return response.data;
};

export const fetchAlerts = async ({ status, type, priority, search, page, page_size } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (type) params.type = type;
  if (priority) params.priority = priority;
  if (search) params.search = search;
  if (page) params.page = page;
  if (page_size) params.page_size = page_size;
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

export const fetchNotifications = async ({ channel, status, assignment, page, page_size } = {}) => {
  const params = {};
  if (channel) params.channel = channel;
  if (status) params.status = status;
  if (assignment) params.assignment = assignment;
  if (page) params.page = page;
  if (page_size) params.page_size = page_size;
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

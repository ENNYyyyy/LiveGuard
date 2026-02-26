import client from './client';

export const fetchAgencyAssignments = async () => {
  const response = await client.get('/api/agency/alerts/');
  return response.data;
};

export const fetchAssignmentLocation = async (assignmentId) => {
  const response = await client.get(`/api/agency/alerts/${assignmentId}/location/`);
  return response.data;
};

export const acknowledgeAssignment = async (assignmentId, payload) => {
  const response = await client.post(
    `/api/agency/alerts/${assignmentId}/acknowledge/`,
    payload
  );
  return response.data;
};

export const updateAssignmentStatus = async (assignmentId, status) => {
  const response = await client.put(`/api/agency/alerts/${assignmentId}/status/`, {
    status,
  });
  return response.data;
};

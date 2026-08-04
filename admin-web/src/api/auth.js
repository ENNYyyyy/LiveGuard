import client from './client';

export const loginAdmin = async ({ email, password }) => {
  const response = await client.post('/api/auth/login/', { email, password });
  return response.data;
};

export const logoutAdmin = async ({ refresh }) => {
  const response = await client.post('/api/auth/logout/', { refresh });
  return response.data;
};

export const fetchProfile = async () => {
  const response = await client.get('/api/auth/profile/');
  return response.data;
};

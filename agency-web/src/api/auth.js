import client from './client';

export const loginAgency = async ({ email, password }) => {
  const response = await client.post('/api/auth/login/', {
    email,
    password,
    client_type: 'AGENCY',
  });
  return response.data;
};

export const logoutAgency = async ({ refresh }) => {
  const response = await client.post('/api/auth/logout/', { refresh });
  return response.data;
};

export const fetchProfile = async () => {
  const response = await client.get('/api/auth/profile/');
  return response.data;
};

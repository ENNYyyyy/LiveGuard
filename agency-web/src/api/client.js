import axios from 'axios';
import config from '../config';
import { storage } from '../storage';

let onAuthFailure = null;

export const setOnAuthFailure = (handler) => {
  onAuthFailure = handler;
};

const client = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use((requestConfig) => {
  const token = storage.getAccessToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !String(originalRequest?.url || '').includes('/api/auth/token/refresh/')
    ) {
      const refresh = storage.getRefreshToken();
      if (!refresh) {
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${config.API_BASE_URL}/api/auth/token/refresh/`,
          { refresh }
        );
        const nextAccess = refreshResponse.data?.access;
        if (nextAccess) {
          storage.setSession({ access: nextAccess });
          originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
          return client(originalRequest);
        }
      } catch {
        storage.clearSession();
        if (onAuthFailure) onAuthFailure();
      }
    }
    return Promise.reject(error);
  }
);

export default client;

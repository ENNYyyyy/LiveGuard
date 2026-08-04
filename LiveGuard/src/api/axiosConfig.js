import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../utils/config';
import { STORAGE_KEYS } from '../utils/constants';
let onAuthFailure = null;

export const setOnAuthFailure = (handler) => {
  onAuthFailure = handler;
};

const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach JWT
axiosInstance.interceptors.request.use(
  async (reqConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 / token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const { data } = await axios.post(`${config.API_BASE_URL}/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return axiosInstance(originalRequest);
      } catch {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_PROFILE,
        ]);
        // Reset auth state so navigation guards redirect to LoginScreen
        if (onAuthFailure) {
          onAuthFailure();
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

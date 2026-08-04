import { Platform } from 'react-native';
import Constants from 'expo-constants';

const resolveApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    const resolvedHost = Platform.OS === 'android' && host === '127.0.0.1'
      ? '10.0.2.2'
      : host;
    return `http://${resolvedHost}:8000`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
};

const config = {
  API_BASE_URL: resolveApiBaseUrl(),
  TIMEOUT: 15000,
  ALERT_TIMEOUT: 60000,
  MAPS_API_KEY: '',
  USE_MOCK: false,
};

export default config;

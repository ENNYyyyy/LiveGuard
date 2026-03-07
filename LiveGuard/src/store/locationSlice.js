import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_LOCATION_KEY = 'LAST_LOCATION';

export const requestLocationPermission = createAsyncThunk(
  'location/requestPermission',
  async (_, { rejectWithValue }) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status; // 'granted' | 'denied' | 'undetermined'
    } catch (err) {
      return rejectWithValue(err.message || 'Permission request failed');
    }
  }
);

export const getCurrentLocation = createAsyncThunk(
  'location/getCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const address = [result?.street, result?.district, result?.city, result?.region, result?.country]
        .filter(Boolean)
        .join(', ');
      const result2 = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude ?? null,
        city: result?.city ?? null,
        state: result?.region ?? null,
        address,
      };
      AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(result2)).catch(() => {});
      return result2;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to get location');
    }
  }
);

/**
 * fetchLocation — unified thunk that:
 * 1. Checks/requests permission
 * 2. On denied: sets permissionStatus='denied', locationError='permission_denied'
 * 3. Gets current position with timeout 10000
 * 4. On timeout/error: sets locationError='timeout'
 * 5. On success: sets coords and clears error
 */
export const fetchLocation = createAsyncThunk(
  'location/fetchLocation',
  async (_, { rejectWithValue }) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return rejectWithValue({ type: 'permission_denied', status });
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const [result] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const address = [result?.street, result?.district, result?.city, result?.region, result?.country]
        .filter(Boolean)
        .join(', ');

      const locationResult = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude ?? null,
        city: result?.city ?? null,
        state: result?.region ?? null,
        address,
        permissionStatus: 'granted',
      };
      AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
        accuracy: locationResult.accuracy,
        altitude: locationResult.altitude,
        city: locationResult.city,
        state: locationResult.state,
        address: locationResult.address,
      })).catch(() => {});
      return locationResult;
    } catch (err) {
      const msg = err?.message || '';
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out');
      return rejectWithValue({ type: isTimeout ? 'timeout' : 'unavailable', message: msg });
    }
  }
);

const initialState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  altitude: null,
  city: null,
  state: null,
  address: null,
  isTracking: false,
  permissionGranted: false,
  permissionStatus: 'undetermined', // 'granted' | 'denied' | 'undetermined'
  locationError: null,              // null | 'permission_denied' | 'timeout' | 'unavailable'
  loading: false,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    clearLocation: () => initialState,
    setLocationError: (state, { payload }) => { state.error = payload; },
    setLocation: (state, { payload }) => {
      state.latitude  = payload.latitude;
      state.longitude = payload.longitude;
      state.address   = payload.address ?? state.address;
    },
  },
  extraReducers: (builder) => {
    // requestLocationPermission
    builder
      .addCase(requestLocationPermission.fulfilled, (state, { payload }) => {
        state.permissionStatus = payload;
        state.permissionGranted = payload === 'granted';
        if (payload === 'denied') {
          state.locationError = 'permission_denied';
        }
      })
      .addCase(requestLocationPermission.rejected, (state, { payload }) => {
        state.permissionGranted = false;
        state.permissionStatus = 'denied';
        state.locationError = 'permission_denied';
        state.error = payload;
      });

    // getCurrentLocation
    builder
      .addCase(getCurrentLocation.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getCurrentLocation.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.latitude = payload.latitude;
        state.longitude = payload.longitude;
        state.accuracy = payload.accuracy;
        state.altitude = payload.altitude ?? null;
        state.city = payload.city ?? null;
        state.state = payload.state ?? null;
        state.address = payload.address;
        state.permissionGranted = true;
        state.permissionStatus = 'granted';
        state.locationError = null;
      })
      .addCase(getCurrentLocation.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
        const msg = (payload || '').toLowerCase();
        if (msg.includes('timeout') || msg.includes('timed out')) {
          state.locationError = 'timeout';
        } else {
          state.locationError = 'unavailable';
        }
      });

    // fetchLocation
    builder
      .addCase(fetchLocation.pending, (state) => {
        state.loading = true;
        state.locationError = null;
        state.error = null;
      })
      .addCase(fetchLocation.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.latitude = payload.latitude;
        state.longitude = payload.longitude;
        state.accuracy = payload.accuracy;
        state.altitude = payload.altitude ?? null;
        state.city = payload.city ?? null;
        state.state = payload.state ?? null;
        state.address = payload.address;
        state.permissionGranted = true;
        state.permissionStatus = 'granted';
        state.locationError = null;
        state.error = null;
      })
      .addCase(fetchLocation.rejected, (state, { payload }) => {
        state.loading = false;
        if (payload?.type === 'permission_denied') {
          state.permissionStatus = payload.status || 'denied';
          state.permissionGranted = false;
          state.locationError = 'permission_denied';
        } else if (payload?.type === 'timeout') {
          state.locationError = 'timeout';
        } else {
          state.locationError = 'unavailable';
        }
        state.error = payload?.message || 'Location unavailable';
      });
  },
});

export const { clearLocation, setLocationError, setLocation } = locationSlice.actions;
export default locationSlice.reducer;

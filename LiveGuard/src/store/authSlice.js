import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import { STORAGE_KEYS } from '../utils/constants';

function parseAuthError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;

  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;

  if (data.errors && typeof data.errors === 'object') {
    const [field, messages] = Object.entries(data.errors)[0] || [];
    if (field) {
      if (Array.isArray(messages) && messages.length) return `${field}: ${messages[0]}`;
      if (typeof messages === 'string') return `${field}: ${messages}`;
    }
  }

  if (typeof data === 'object') {
    const [field, messages] = Object.entries(data)[0] || [];
    if (field) {
      if (Array.isArray(messages) && messages.length) return `${field}: ${messages[0]}`;
      if (typeof messages === 'string') return `${field}: ${messages}`;
    }
  }
  return fallback;
}

// Backend returns { full_name, phone_number, ... }.
// Screens also use firstName, lastName, phone so we derive them here.
function normalizeUser(user) {
  if (!user) return null;
  const parts = (user.full_name || '').trim().split(' ');
  return {
    ...user,
    firstName: parts[0] || '',
    lastName:  parts.slice(1).join(' ') || '',
    phone:     user.phone_number || '',
  };
}

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ first_name, last_name, email, phone_number, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/auth/register/', {
        full_name: `${first_name} ${last_name}`.trim(),
        email,
        phone_number,
        password,
      });
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      return { ...data, user: normalizeUser(data.user) };
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Registration failed'));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/auth/login/', { email, password });
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      return { ...data, user: normalizeUser(data.user) };
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Login failed'));
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      await api.post('/api/auth/logout/', { refresh: refreshToken });
    }
  } catch {
    // Proceed with local logout even if the backend call fails
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
    ]);
  }
});

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return null;
      const { data } = await api.get('/api/auth/profile/');
      return { user: normalizeUser(data), accessToken: token };
    } catch {
      return null;
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ first_name, last_name, phone_number, ...rest }, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/api/auth/profile/', {
        full_name: `${first_name} ${last_name}`.trim(),
        phone_number,
        ...rest,
      });
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));
      return normalizeUser(data);
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Profile update failed'));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ current_password, new_password }, { rejectWithValue }) => {
    try {
      await api.post('/api/auth/change-password/', { current_password, new_password });
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Password change failed'));
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async ({ password }, { rejectWithValue }) => {
    try {
      await api.delete('/api/auth/delete-account/', { data: { password } });
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PROFILE,
      ]);
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Account deletion failed'));
    }
  }
);

export const registerDevice = createAsyncThunk(
  'auth/registerDevice',
  async (push_token, { rejectWithValue }) => {
    try {
      await api.post('/api/auth/register-device/', { push_token });
    } catch (err) {
      return rejectWithValue(parseAuthError(err, 'Device registration failed'));
    }
  }
);

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    // registerUser
    builder
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.access;
        state.refreshToken = payload.refresh;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.access;
        state.refreshToken = payload.refresh;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    // logoutUser
    builder.addCase(logoutUser.fulfilled, () => initialState);

    // loadStoredAuth
    builder
      .addCase(loadStoredAuth.pending, (state) => { state.loading = true; })
      .addCase(loadStoredAuth.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload) {
          state.user = payload.user;
          state.accessToken = payload.accessToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => { state.loading = false; });

    // updateProfile
    builder
      .addCase(updateProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateProfile.fulfilled, (state, { payload }) => { state.loading = false; state.user = payload; })
      .addCase(updateProfile.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    // registerDevice — fire and forget, no state change needed
    builder.addCase(registerDevice.rejected, (state, { payload }) => { state.error = payload; });

    // deleteAccount — clear state on success
    builder.addCase(deleteAccount.fulfilled, () => initialState);
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

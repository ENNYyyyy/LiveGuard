import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axiosConfig';

export const createEmergencyAlert = createAsyncThunk(
  'alert/create',
  async ({ alert_type, priority_level, description, latitude, longitude, accuracy }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/alerts/create/', {
        alert_type, priority_level, description, latitude, longitude, accuracy,
      });
      return data;
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        if (errData.detail) return rejectWithValue(errData.detail);
        // DRF field-level errors: { field: ["msg", ...], ... }
        const fieldErrors = Object.entries(errData)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join('; ');
        if (fieldErrors) return rejectWithValue(fieldErrors);
      }
      return rejectWithValue('Failed to send alert. Please try again.');
    }
  }
);

export const fetchAlertStatus = createAsyncThunk(
  'alert/fetchStatus',
  async (alert_id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/alerts/${alert_id}/status/`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch alert status');
    }
  }
);

export const fetchAlertHistory = createAsyncThunk(
  'alert/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/alerts/history/');
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch history');
    }
  }
);

export const cancelAlert = createAsyncThunk(
  'alert/cancel',
  async (alert_id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/api/alerts/${alert_id}/cancel/`);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to cancel alert');
    }
  }
);

export const updateAlertLocation = createAsyncThunk(
  'alert/updateLocation',
  async ({ alertId, latitude, longitude, accuracy }, { rejectWithValue }) => {
    try {
      const payload = { latitude, longitude };
      if (accuracy != null) payload.accuracy = accuracy;
      const { data } = await api.patch(`/api/alerts/${alertId}/location/`, payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update location');
    }
  }
);

const initialState = {
  currentAlert: null,
  alertHistory: [],
  alertStatus: null,
  submitting: false,
  loading: false,
  error: null,
};

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    clearCurrentAlert: (state) => {
      state.currentAlert = null;
      state.alertStatus = null;
    },
    clearAlertError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // createEmergencyAlert
    builder
      .addCase(createEmergencyAlert.pending, (state) => { state.submitting = true; state.error = null; })
      .addCase(createEmergencyAlert.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.currentAlert = payload;
      })
      .addCase(createEmergencyAlert.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      });

    // fetchAlertStatus
    builder
      .addCase(fetchAlertStatus.pending, (state) => { state.loading = true; })
      .addCase(fetchAlertStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.alertStatus = payload;
        state.currentAlert = payload;  // keep currentAlert fresh so AlertStatusScreen reflects updates
      })
      .addCase(fetchAlertStatus.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });

    // fetchAlertHistory
    builder
      .addCase(fetchAlertHistory.pending, (state) => { state.loading = true; })
      .addCase(fetchAlertHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.alertHistory = payload;
      })
      .addCase(fetchAlertHistory.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });

    // cancelAlert — backend returns { message, alert_id }, not a full alert object
    builder
      .addCase(cancelAlert.fulfilled, (state) => {
        if (state.currentAlert) {
          state.currentAlert = { ...state.currentAlert, status: 'CANCELLED' };
        }
        state.alertStatus = 'CANCELLED';
      })
      .addCase(cancelAlert.rejected, (state, { payload }) => {
        state.error = payload;
      });
  },
});

export const { clearCurrentAlert, clearAlertError } = alertSlice.actions;
export default alertSlice.reducer;

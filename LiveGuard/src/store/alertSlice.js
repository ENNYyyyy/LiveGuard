import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import config from '../utils/config';

const QUEUED_ALERT_KEY = 'QUEUED_OFFLINE_ALERT';

const flattenErrorMessages = (value, parentKey = '') => {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorMessages(item, parentKey));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nested]) => {
      const combined = parentKey ? `${parentKey}.${key}` : key;
      return flattenErrorMessages(nested, combined);
    });
  }

  if (parentKey) {
    return [`${parentKey}: ${value}`];
  }
  return [`${value}`];
};

export const createEmergencyAlert = createAsyncThunk(
  'alert/create',
  async ({ alert_type, risk_answers, description, latitude, longitude, accuracy, altitude, city, state }, { rejectWithValue }) => {
    const payload = { alert_type, risk_answers, description, latitude, longitude, accuracy, altitude, city, state };
    try {
      const { data } = await api.post('/api/alerts/create/', payload, { timeout: config.ALERT_TIMEOUT });
      await AsyncStorage.removeItem(QUEUED_ALERT_KEY);
      return data;
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers?.['retry-after'], 10) || 60;
        return rejectWithValue({ isRateLimit: true, retryAfter });
      }
      // No response = network failure — queue the alert locally for retry when connectivity returns
      if (!err.response) {
        await AsyncStorage.setItem(QUEUED_ALERT_KEY, JSON.stringify(payload));
        return rejectWithValue({ isOffline: true });
      }
      const errData = err.response?.data;
      if (errData) {
        if (typeof errData === 'string') return rejectWithValue(errData);
        if (errData.detail) return rejectWithValue(errData.detail);
        if (typeof errData === 'object') {
          const fieldErrors = flattenErrorMessages(errData).join('; ');
          if (fieldErrors) return rejectWithValue(fieldErrors);
        }
      }
      return rejectWithValue('Failed to send alert. Please try again.');
    }
  }
);

export const retryQueuedAlert = createAsyncThunk(
  'alert/retryQueued',
  async (_, { rejectWithValue }) => {
    try {
      const stored = await AsyncStorage.getItem(QUEUED_ALERT_KEY);
      if (!stored) return null;
      const payload = JSON.parse(stored);
      const { data } = await api.post('/api/alerts/create/', payload, { timeout: config.ALERT_TIMEOUT });
      await AsyncStorage.removeItem(QUEUED_ALERT_KEY);
      return data;
    } catch {
      return rejectWithValue('retry_failed');
    }
  }
);

export const fetchPriorityQuestions = createAsyncThunk(
  'alert/fetchPriorityQuestions',
  async (alert_type, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/alerts/priority-questions/', {
        params: { alert_type },
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to load risk questions for this threat type.'
      );
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

export const rateAlert = createAsyncThunk(
  'alert/rate',
  async ({ alertId, rating }, { rejectWithValue }) => {
    try {
      await api.patch(`/api/alerts/${alertId}/rate/`, { rating });
      return { alertId, rating };
    } catch (err) {
      return rejectWithValue('Failed to submit rating');
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
  submitError: null,
  statusError: null,
  historyError: null,
  historyLastFetched: null,
  cancelError: null,
  rateLimitUntil: null,
  priorityQuestions: [],
  priorityQuestionsVersion: null,
  questionsLoading: false,
  questionsError: null,
  questionsCache: {},  // { [alert_type]: { questions, version } }
  queuedAlert: null,   // payload saved offline, waiting for connectivity
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
      state.submitError = null;
      state.statusError = null;
      state.historyError = null;
      state.cancelError = null;
      state.questionsError = null;
      state.rateLimitUntil = null;
    },
    loadQuestionsFromCache: (state, { payload }) => {
      state.priorityQuestions = payload.questions;
      state.priorityQuestionsVersion = payload.version ?? null;
      state.questionsLoading = false;
      state.questionsError = null;
    },
  },
  extraReducers: (builder) => {
    // createEmergencyAlert
    builder
      .addCase(createEmergencyAlert.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
        state.rateLimitUntil = null;
      })
      .addCase(createEmergencyAlert.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.currentAlert = payload;
        state.submitError = null;
        state.rateLimitUntil = null;
      })
      .addCase(createEmergencyAlert.rejected, (state, { payload }) => {
        state.submitting = false;
        if (payload?.isRateLimit) {
          state.rateLimitUntil = Date.now() + payload.retryAfter * 1000;
          state.submitError = null;
        } else if (payload?.isOffline) {
          state.queuedAlert = true;
          state.submitError = 'No internet connection. Your alert has been saved and will be sent automatically when connectivity is restored.';
        } else {
          state.submitError = typeof payload === 'string' ? payload : 'Failed to send alert. Please try again.';
        }
      });

    // fetchAlertStatus
    builder
      .addCase(fetchAlertStatus.pending, (state) => {
        state.loading = true;
        state.statusError = null;
      })
      .addCase(fetchAlertStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.alertStatus = payload;
        state.currentAlert = payload;  // keep currentAlert fresh so AlertStatusScreen reflects updates
        state.statusError = null;
      })
      .addCase(fetchAlertStatus.rejected, (state, { payload }) => {
        state.loading = false;
        state.statusError = payload;
      });

    // fetchAlertHistory
    builder
      .addCase(fetchAlertHistory.pending, (state) => {
        state.loading = true;
        state.historyError = null;
      })
      .addCase(fetchAlertHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.alertHistory = payload;
        state.historyError = null;
        state.historyLastFetched = Date.now();
      })
      .addCase(fetchAlertHistory.rejected, (state, { payload }) => {
        state.loading = false;
        state.historyError = payload;
      });

    // cancelAlert — backend returns { message, alert_id }, not a full alert object
    builder
      .addCase(cancelAlert.fulfilled, (state) => {
        if (state.currentAlert) {
          state.currentAlert = { ...state.currentAlert, status: 'CANCELLED' };
        }
        state.alertStatus = 'CANCELLED';
        state.cancelError = null;
      })
      .addCase(cancelAlert.rejected, (state, { payload }) => {
        state.cancelError = payload;
      });

    // fetchPriorityQuestions
    builder
      .addCase(fetchPriorityQuestions.pending, (state) => {
        state.questionsLoading = true;
        state.questionsError = null;
        state.priorityQuestions = [];
        state.priorityQuestionsVersion = null;
      })
      .addCase(fetchPriorityQuestions.fulfilled, (state, { payload, meta }) => {
        state.questionsLoading = false;
        state.priorityQuestions = payload?.questions || [];
        state.priorityQuestionsVersion = payload?.version ?? null;
        state.questionsError = null;
        state.questionsCache[meta.arg] = {
          questions: payload?.questions || [],
          version: payload?.version ?? null,
        };
      })
      .addCase(fetchPriorityQuestions.rejected, (state, { payload }) => {
        state.questionsLoading = false;
        state.priorityQuestions = [];
        state.priorityQuestionsVersion = null;
        state.questionsError = payload;
      });

    // retryQueuedAlert
    builder
      .addCase(retryQueuedAlert.fulfilled, (state, { payload }) => {
        if (payload) {
          state.currentAlert = payload;
          state.queuedAlert = null;
          state.submitError = null;
        }
      })
      .addCase(retryQueuedAlert.rejected, (state) => {
        // Stay queued — will retry again on next connectivity event
      });
  },
});

export const { clearCurrentAlert, clearAlertError, loadQuestionsFromCache } = alertSlice.actions;
export default alertSlice.reducer;


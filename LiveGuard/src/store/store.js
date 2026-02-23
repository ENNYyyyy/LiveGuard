import { configureStore } from '@reduxjs/toolkit';
import authReducer, { logoutUser } from './authSlice';
import alertReducer from './alertSlice';
import locationReducer from './locationSlice';
import config from '../utils/config';
import { mockAuth, mockAlert, mockLocation } from '../utils/mockData';
import { setOnAuthFailure } from '../api/axiosConfig';
import { resetToOnboarding } from '../navigation/navigationRef';

const preloadedState = config.USE_MOCK
  ? { auth: mockAuth, alert: mockAlert, location: mockLocation }
  : undefined;

const store = configureStore({
  reducer: {
    auth: authReducer,
    alert: alertReducer,
    location: locationReducer,
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

setOnAuthFailure(() => {
  store.dispatch(logoutUser());
  resetToOnboarding();
});

export default store;

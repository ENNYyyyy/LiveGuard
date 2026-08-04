import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginAdmin, logoutAdmin, fetchProfile } from '../api/auth';
import { fetchDashboard } from '../api/admin';
import { parseApiError } from '../api/errors';
import { storage } from '../storage';
import { setOnAuthFailure } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(storage.getUser());
  const [accessToken, setAccessToken] = useState(storage.getAccessToken());
  const [refreshToken, setRefreshToken] = useState(storage.getRefreshToken());
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const clearAuth = () => {
    storage.clearSession();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  useEffect(() => {
    setOnAuthFailure(() => {
      clearAuth();
    });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!storage.getAccessToken()) {
        setBootstrapped(true);
        return;
      }
      try {
        const profile = await fetchProfile();
        // Verify admin access is still valid
        await fetchDashboard();
        setUser(profile);
        setAccessToken(storage.getAccessToken());
        setRefreshToken(storage.getRefreshToken());
        storage.setSession({ user: profile });
      } catch {
        clearAuth();
      } finally {
        setBootstrapped(true);
      }
    };
    bootstrap();
  }, []);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await loginAdmin({ email, password });
      // Store tokens so the client interceptor can send them on the next request
      storage.setSession({ access: data.access, refresh: data.refresh, user: data.user });
      // Validate this account has admin access
      try {
        await fetchDashboard();
      } catch (adminError) {
        storage.clearSession();
        if (adminError.response?.status === 403) {
          return { ok: false, message: 'This account does not have admin privileges.' };
        }
        return { ok: false, message: parseApiError(adminError, 'Could not verify admin access.') };
      }
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setUser(data.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: parseApiError(error, 'Login failed.') };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refresh = refreshToken || storage.getRefreshToken();
    if (refresh) {
      try {
        await logoutAdmin({ refresh });
      } catch {
        // Ignore server-side failure and clear locally anyway.
      }
    }
    clearAuth();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      bootstrapped,
      isAuthenticated: Boolean(accessToken && user),
      login,
      logout,
    }),
    [user, loading, bootstrapped, accessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

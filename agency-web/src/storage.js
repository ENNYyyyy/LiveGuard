const keys = {
  access: 'agency_access_token',
  refresh: 'agency_refresh_token',
  user: 'agency_user_profile',
};

export const storage = {
  keys,
  getAccessToken: () => localStorage.getItem(keys.access),
  getRefreshToken: () => localStorage.getItem(keys.refresh),
  getUser: () => {
    const raw = localStorage.getItem(keys.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSession: ({ access, refresh, user }) => {
    if (access) localStorage.setItem(keys.access, access);
    if (refresh) localStorage.setItem(keys.refresh, refresh);
    if (user) localStorage.setItem(keys.user, JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem(keys.access);
    localStorage.removeItem(keys.refresh);
    localStorage.removeItem(keys.user);
  },
};


import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.data.accessToken);
      const profile = await api.get('/auth/me');
      setUser(profile.data.data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
  };
  const register = async (values) => api.post('/auth/register', values);
  const logout = async () => {
    try { await api.post('/auth/logout'); }
    finally { setAccessToken(null); setUser(null); }
  };

  const value = useMemo(() => ({ user, loading, login, register, logout, reload: loadUser }),
    [user, loading, loadUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};

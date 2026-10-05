import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || '/api';

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [organization, setOrg]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [token, setToken]         = useState(() => localStorage.getItem('dt_token'));

  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  }, [token]);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch('/auth/me')
      .then(({ user, organization }) => { setUser(user); setOrg(organization); })
      .catch(() => { localStorage.removeItem('dt_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token, apiFetch]);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('dt_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setOrg(data.organization);
    return data;
  }, [apiFetch]);

  const register = useCallback(async (orgName, email, password, firstName, lastName) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ org_name: orgName, email, password, first_name: firstName, last_name: lastName }),
    });
    localStorage.setItem('dt_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setOrg(data.organization);
    return data;
  }, [apiFetch]);

  const logout = useCallback(() => {
    localStorage.removeItem('dt_token');
    setToken(null);
    setUser(null);
    setOrg(null);
  }, []);

  const authFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user, organization, loading, token,
      login, register, logout, authFetch,
      isOwner: user?.role === 'owner',
      isAdmin: ['owner', 'admin'].includes(user?.role),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => {
    const d = response.data;
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      if (Array.isArray(d.members))       { response.data = d.members;       return response; }
      if (Array.isArray(d.documents))     { response.data = d.documents;     return response; }
      if (Array.isArray(d.events))        { response.data = d.events;        return response; }
      if (Array.isArray(d.alerts))        { response.data = d.alerts;        return response; }
      if (Array.isArray(d.sessions))      { response.data = d.sessions;      return response; }
      if (Array.isArray(d.devices))       { response.data = d.devices;       return response; }
      if (Array.isArray(d.shares))        { response.data = d.shares;        return response; }
      if (Array.isArray(d.notifications)) { response.data = d.notifications; return response; }
      if (Array.isArray(d.rows))          { response.data = d.rows;          return response; }
    }
    return response;
  },
  error => {
    // Ne déconnecter QUE si le token est vraiment invalide
    if (error.response?.status === 401) {
      const msg = error.response?.data?.error || '';
      if (msg.includes('Token') || msg.includes('token') || msg.includes('invalide') || msg.includes('expiré')) {
        localStorage.removeItem('dt_token');
        window.location.href = '/login';
      }
    }
    // Pour toutes les autres erreurs — ne pas déconnecter, juste rejeter
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

// Lit le token à chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('dt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise les réponses SaaS vers le format original
api.interceptors.response.use(
  response => {
    const d = response.data;
    // Normaliser les réponses SaaS qui encapsulent dans un objet
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      if (d.documents) { response.data = d.documents; return response; }
      if (d.members)   { response.data = d.members;   return response; }
      if (d.events)    { response.data = d.events;     return response; }
      if (d.alerts)    { response.data = d.alerts;     return response; }
      if (d.sessions)  { response.data = d.sessions;   return response; }
      if (d.devices)   { response.data = d.devices;    return response; }
      if (d.shares)    { response.data = d.shares;     return response; }
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// src/api/client.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qbank_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('qbank_token');
      localStorage.removeItem('qbank_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

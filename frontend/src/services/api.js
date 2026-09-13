import axios from 'axios';

/**
 * Axios API Instance Configuration
 * Automatically uses VITE_BACKEND_URL from environment variables for production (e.g. Render/Vercel)
 * or falls back to local relative path '/api'.
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const API = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically attach authorization header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;

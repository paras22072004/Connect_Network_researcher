import axios from 'axios';
import { getToken } from '../utils/storage';

// Base API URL from environment variable or fallback to local backend port 5001
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

const API = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Automatically attach JWT Bearer Token
API.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;

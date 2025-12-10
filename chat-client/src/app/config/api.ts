import axios from 'axios';
import { AppConfig } from './app.config';

export const api = axios.create({
  baseURL: AppConfig.apiUrl,
  timeout: 10000
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = AppConfig.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', error.response ? error.response.data : error.message);

    // Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

import axios from 'axios';
import { AppConfig } from './app.config';

export const api = axios.create({
  baseURL: AppConfig.apiUrl,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = AppConfig.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);


import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  timeout: 15000
});

let accessToken = null;
let refreshing = null;
export const setAccessToken = (token) => { accessToken = token; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retried &&
        !original.url?.includes('/auth/login') && !original.url?.includes('/auth/refresh')) {
      original._retried = true;
      try {
        refreshing ||= api.post('/auth/refresh').then(({ data }) => {
          setAccessToken(data.data.accessToken);
          return data.data.accessToken;
        }).finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

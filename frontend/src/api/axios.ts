import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser set Content-Type with boundary for multipart uploads
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Auto-unwrap backend envelope and redirect on 401
api.interceptors.response.use(
  (res) => {
    // Our backend uses successResponse util which wraps the actual payload in a 'data' field.
    // Unwrapping it here saves us from doing data.data in every store.
    if (res.data && res.data.success !== undefined && res.data.data !== undefined) {
      (res as any).meta = res.data.meta; // Preserve meta (like nextCursor) on the response object
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const isAuthRoute = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

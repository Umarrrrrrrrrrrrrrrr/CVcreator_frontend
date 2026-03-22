// API Configuration - Frontend Integration Credentials
// Base URL: http://localhost:8000
// Auth: Authorization: Bearer <access_token>
// Token storage: localStorage.setItem('accessToken', tokens.access)

const API_CONFIG = {
  /** Backend URL — must match where `python manage.py runserver` runs (default port 8000). */
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',

  ENDPOINTS: {
    REGISTER: '/api/register/',
    LOGIN: '/api/login/',
    PROFILE: '/api/auth/profile/',
    JOBS: '/api/jobs/',
    /** Staff-only CRUD — same Job model, all statuses */
    ADMIN_JOBS_MANAGE: '/api/jobs/manage/',
    JOBS_APPLICATIONS: '/api/jobs/applications/',
    CV_GRADE: '/api/cv/grade/',
    ESEWA_INITIATE: '/api/payments/esewa/initiate/',
    ESEWA_VERIFY: '/api/payments/esewa/verify/',
    KHALTI_INITIATE: '/api/payments/khalti/initiate/',
    KHALTI_VERIFY: '/api/payments/khalti/verify/',
    ADMIN_USERS: '/api/auth/admin/users/',
    /** POST — only works when Django DEBUG=True (local dev). */
    DEV_RESET_PASSWORD: '/api/auth/dev-reset-password/',
  }
};

const TOKEN_KEY = 'accessToken';

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/** Main admin account (for on-screen hints). Change if you use another staff user. */
export const ADMIN_PRIMARY_EMAIL = 'umarismyname581@gmail.com';

/** Get auth headers for protected endpoints */
export const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/** Fetch with auth - use for protected endpoints (Profile, Jobs POST, etc.) */
export const fetchWithAuth = (url, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
};

export default API_CONFIG;

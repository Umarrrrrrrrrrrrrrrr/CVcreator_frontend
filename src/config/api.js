// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  // Alternative: 'http://127.0.0.1:8000'
  
  ENDPOINTS: {
    REGISTER: '/api/register/',
    LOGIN: '/api/login/',
    // Alternative endpoints to try:
    // REGISTER: '/api/auth/register/',
    // REGISTER: '/api/users/register/',
    // REGISTER: '/register/',
  }
};

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export default API_CONFIG;

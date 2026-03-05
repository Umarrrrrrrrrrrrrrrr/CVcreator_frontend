// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  // Alternative: 'http://127.0.0.1:8000'

  ENDPOINTS: {
    REGISTER: '/api/register/',
    LOGIN: '/api/login/',
    JOBS: '/api/jobs/',
    JOBS_APPLICATIONS: '/api/jobs/applications/',
    CV_GRADE: '/api/cv/grade/',
    // Payment
    ESEWA_INITIATE: '/api/payments/esewa/initiate/',
    ESEWA_VERIFY: '/api/payments/esewa/verify/',
    KHALTI_INITIATE: '/api/payments/khalti/initiate/',
    KHALTI_VERIFY: '/api/payments/khalti/verify/',
  }
};

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export default API_CONFIG;

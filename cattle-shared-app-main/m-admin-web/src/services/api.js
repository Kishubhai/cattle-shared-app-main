import axios from 'axios';

// Base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, fall through to logout
        }
      }

      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/admin/login', credentials),

  requestLoginOTP: (mobileNumber) => api.post('/auth/admin/login/otp/request', { mobileNumber }),

  verifyLoginOTP: (data) => api.post('/auth/admin/login/otp/verify', data),

  getMe: () => api.get('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('admin');
    return Promise.resolve();
  },
};

// M_Admin Cattle Verification API
export const mAdminAPI = {
  // Get pending cattle
  getPendingCattle: (params) => api.get('/admin/m-admin/cattle/pending', { params }),

  // Get cattle for verification with all other cattle for comparison
  getCattleForVerification: (cattleId) => api.get(`/admin/m-admin/cattle/${cattleId}/verify`),

  // Approve cattle
  approveCattle: (cattleId) => api.put(`/admin/m-admin/cattle/${cattleId}/approve`),

  // Reject cattle
  rejectCattle: (cattleId, reason) => api.put(`/admin/m-admin/cattle/${cattleId}/reject`, { reason }),

  // Identification Requests
  getPendingIdentificationRequests: (params) => api.get('/admin/m-admin/identification/pending', { params }),

  getIdentificationRequest: (requestId) => api.get(`/admin/m-admin/identification/${requestId}`),

  getFarmerCattleForIdentification: (requestId) => api.get(`/admin/m-admin/identification/${requestId}/farmer-cattle`),

  startProcessingIdentification: (requestId) => api.put(`/admin/m-admin/identification/${requestId}/start`),

  completeIdentification: (requestId, data) => api.put(`/admin/m-admin/identification/${requestId}/complete`, data),

  failIdentification: (requestId, data) => api.put(`/admin/m-admin/identification/${requestId}/fail`, data),

  // Verification History
  getVerificationHistory: (params) => api.get('/admin/m-admin/verification-history', { params }),

  updateVerificationDecision: (cattleId, data) => api.put(`/admin/m-admin/verification-history/${cattleId}`, data),

  // Identification History
  getIdentificationHistory: (params) => api.get('/admin/m-admin/identification-history', { params }),

  updateIdentificationDecision: (requestId, data) => api.put(`/admin/m-admin/identification-history/${requestId}`, data),

  // ML Registration Management
  getMLFailedCattle: (params) => api.get('/admin/m-admin/ml-failed-cattle', { params }),

  manualMLRegisterCattle: (cattleId) => api.post(`/admin/m-admin/cattle/${cattleId}/register-ml`),
  manuallyApproveCattle: (cattleId) => api.put(`/admin/m-admin/cattle/${cattleId}/manually-approve`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard'),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  markNotificationRead: (notificationId) => api.put(`/admin/notifications/${notificationId}/read`),
  markAllNotificationsRead: () => api.put('/admin/notifications/read-all'),
};

export default api;

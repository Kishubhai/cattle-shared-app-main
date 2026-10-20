import apiClient from '../client';
import {
  SignupData,
  LoginData,
  OTPLoginData,
  AdminLoginData,
  AuthResponse
} from '../../types/auth.types';

export const authAPI = {
  // ── USER AUTHENTICATION ────────────────────────────────────────────────────

  signup: async (data: SignupData): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/signup', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Returns: { success, otpAlreadySent?, remainingSeconds?, expiresAt?, data? }
  // If otpAlreadySent=true → OTP still valid, frontend should jump to OTP input directly
  requestOTP: async (mobileNumber: string): Promise<any> => {
    const response = await apiClient.post('/auth/login/otp/request', { mobileNumber });
    return response.data;
  },

  verifyOTP: async (data: OTPLoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/otp/verify', data);
    return response.data;
  },

  resendOTP: async (mobileNumber: string): Promise<any> => {
    const response = await apiClient.post('/auth/resend-otp', { mobileNumber });
    return response.data;
  },

  requestPasswordResetOTP: async (mobileNumber: string): Promise<any> => {
    try {
      // Fixed: was wrongly calling /auth/reset-password/request
      const response = await apiClient.post('/auth/forgot-password', { mobileNumber });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  resetPassword: async (data: {
    mobileNumber: string;
    otp: string;
    password: string;
    confirmPassword: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // ── ADMIN AUTHENTICATION ───────────────────────────────────────────────────

  adminLogin: async (data: AdminLoginData): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/admin/login', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  adminRequestOTP: async (email: string): Promise<any> => {
    try {
      const response = await apiClient.post('/auth/admin/login/otp/request', { email });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  adminVerifyOTP: async (data: { email: string; otp: string }): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/admin/login/otp/verify', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getCurrentUser: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

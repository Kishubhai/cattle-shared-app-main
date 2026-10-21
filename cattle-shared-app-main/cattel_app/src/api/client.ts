import axios, { AxiosInstance, AxiosError } from 'axios';
import ENV from '../config/env';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearStorage } from '../utils/storage';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: ENV.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);

        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token attached');
        }

        // Let RN set multipart boundary — forcing Content-Type breaks Multer parsing
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
          const headers = config.headers as any;
          if (headers?.delete) {
            headers.delete('Content-Type');
            headers.delete('content-type');
          } else if (headers) {
            delete headers['Content-Type'];
            delete headers['content-type'];
          }
        }

        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
      },
      async (error: AxiosError) => {
        console.error('❌ API Error Response:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        const originalRequest = error.config as any;

        // Handle 401 Unauthorized — try to refresh token before logging out
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue this request until the ongoing refresh completes
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            console.log('🔄 Attempting token refresh...');
            const response = await axios.post(`${ENV.API_BASE_URL}/auth/refresh-token`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
            await saveToken(accessToken);
            await saveRefreshToken(newRefreshToken);

            console.log('✅ Token refreshed successfully');
            this.processQueue(null, accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.log('🔐 Token refresh failed - clearing all auth data');
            this.processQueue(refreshError, null);
            await clearStorage();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    this.failedQueue = [];
  }

  getInstance(): AxiosInstance {
    return this.client;
  }
}

export default new ApiClient().getInstance();

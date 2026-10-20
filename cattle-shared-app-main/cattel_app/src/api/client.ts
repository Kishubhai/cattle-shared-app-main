import axios, { AxiosInstance, AxiosError } from 'axios';
import ENV from '../config/env';
import { getToken, clearStorage } from '../utils/storage';

class ApiClient {
  private client: AxiosInstance;

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

        // Handle 401 Unauthorized — clear all auth data so app returns to login
        if (error.response?.status === 401) {
          console.log('🔐 Unauthorized - clearing all auth data');
          await clearStorage();
        }

        return Promise.reject(error);
      }
    );
  }

  getInstance(): AxiosInstance {
    return this.client;
  }
}

export default new ApiClient().getInstance();
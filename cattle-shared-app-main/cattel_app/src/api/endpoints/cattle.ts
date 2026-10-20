import apiClient from '../client';
import ENV from '../../config/env';

const SERVER_URL = ENV.API_BASE_URL.replace('/api/v1', '');

/** Build full URL for a cattle image: category = muzzle | face | left | right | fullBodyLeft | fullBodyRight */
export const buildCattleImageUrl = (category: string, filename: string): string => {
  return `${SERVER_URL}/uploads/cattle/${category}/${filename}`;
};

export const cattleAPI = {
  // Get all cattle for the logged-in user (includes status counts)
  getMyCattle: async (status?: string): Promise<any> => {
    const url = status ? `/users/cattle?status=${status}` : '/users/cattle';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get single cattle by ID (ownership enforced on backend)
  getCattleById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/users/cattle/${id}`);
    return response.data;
  },

  // Register new cattle — sends FormData with 12 images
  // Do not set Content-Type manually; RN must add the multipart boundary.
  registerCattle: async (data: FormData): Promise<any> => {
    const response = await apiClient.post('/cattle/register', data);
    return response.data;
  },

  // Archive cattle (move to recycle bin)
  archiveCattle: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/cattle/${id}/archive`);
    return response.data;
  },

  // Restore cattle from archive
  restoreCattle: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/cattle/${id}/restore`);
    return response.data;
  },

  // Permanently delete cattle
  deleteCattle: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/cattle/${id}`);
    return response.data;
  },

  // ========== IDENTIFICATION ENDPOINTS ==========
  // Routes mounted at /api/v1/cattle, so prefix is /cattle/identify

  // Create identification request (upload 4 images: front, back, right, left)
  createIdentificationRequest: async (data: FormData): Promise<any> => {
    const response = await apiClient.post('/cattle/identify', data);
    return response.data;
  },

  // Get my identification requests
  getMyIdentificationRequests: async (status?: string): Promise<any> => {
    const url = status
      ? `/cattle/identify/my-requests?status=${status}`
      : '/cattle/identify/my-requests';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get identification statistics
  getIdentificationStatistics: async (): Promise<any> => {
    const response = await apiClient.get('/cattle/identify/statistics');
    return response.data;
  },

  // Get identification request by ID
  getIdentificationRequestById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/cattle/identify/${id}`);
    return response.data;
  },

  // Cancel identification request
  cancelIdentificationRequest: async (id: string, reason?: string): Promise<any> => {
    const response = await apiClient.put(`/cattle/identify/${id}/cancel`, { reason });
    return response.data;
  },
};

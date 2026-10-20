import apiClient from '../client';
import ENV from '../../config/env';

const SERVER_URL = ENV.API_BASE_URL.replace('/api/v1', '');

/** Build a full URL from a server-relative file path (e.g. uploads/profiles/abc.jpg) */
export const buildImageUrl = (path?: string): string | null => {
  if (!path) return null;
  return `${SERVER_URL}/${path}`;
};

export const userAPI = {
  getProfile: async (): Promise<any> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: any): Promise<any> => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<any> => {
    const response = await apiClient.put('/users/change-password', data);
    return response.data;
  },

  getStatistics: async (): Promise<any> => {
    const response = await apiClient.get('/users/statistics');
    return response.data;
  },

  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    const response = await apiClient.get(`/users/notifications?${queryParams}`);
    return response.data;
  },

  markNotificationRead: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/users/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsRead: async (): Promise<any> => {
    const response = await apiClient.put('/users/notifications/read-all');
    return response.data;
  },

  uploadProfileImage: async (imageUri: string): Promise<any> => {
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('profilePicture', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiClient.put('/users/profile-picture', formData);
    return response.data;
  },
};

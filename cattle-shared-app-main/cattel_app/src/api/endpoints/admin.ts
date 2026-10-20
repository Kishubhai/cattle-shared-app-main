import apiClient from '../client';

/**
 * Super Admin API Endpoints
 * Base path: /api/v1/admin/super-admin
 */
export const superAdminAPI = {
  // ========== DASHBOARD & STATISTICS ==========

  getDashboardStats: async (): Promise<any> => {
    const response = await apiClient.get('/admin/super-admin/statistics');
    return response.data;
  },

  // ========== REGIONAL ADMIN MANAGEMENT ==========

  getAllRegionalAdmins: async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    state?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.state) queryParams.append('state', params.state);
    queryParams.append('role', 'regional_admin');
    const response = await apiClient.get(`/admin/super-admin/regional-admins?${queryParams}`);
    return response.data;
  },

  createRegionalAdmin: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
    jurisdictionLevel: string;
    assignedRegion: {
      state: string;
      district: string;
    };
  }): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/regional-admins', data);
    return response.data;
  },

  approveRegionalAdmin: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/admin/super-admin/regional-admins/${id}/approve`);
    return response.data;
  },

  deactivateRegionalAdmin: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/admin/super-admin/regional-admins/${id}/deactivate`);
    return response.data;
  },

  activateRegionalAdmin: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/admin/super-admin/regional-admins/${id}/activate`);
    return response.data;
  },

  // ========== FARMER MANAGEMENT ==========

  getAllFarmers: async (params?: {
    page?: number;
    limit?: number;
    state?: string;
    district?: string;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.state) queryParams.append('state', params.state);
    if (params?.district) queryParams.append('district', params.district);
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/super-admin/farmers?${queryParams}`);
    return response.data;
  },

  getFarmerById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/super-admin/farmers/${id}`);
    return response.data;
  },

  searchFarmerByPhone: async (phoneNumber: string): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/search-by-phone', { phoneNumber });
    return response.data;
  },

  deleteFarmer: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/super-admin/farmers/${id}`);
    return response.data;
  },

  // ========== CATTLE MANAGEMENT ==========

  getAllCattle: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    state?: string;
    district?: string;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.district) queryParams.append('district', params.district);
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/super-admin/cattle?${queryParams}`);
    return response.data;
  },

  getCattleById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/super-admin/cattle/${id}`);
    return response.data;
  },

  searchCattle: async (query: string): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/search', { query });
    return response.data;
  },

  // ========== ARCHIVE MANAGEMENT ==========

  getArchive: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const response = await apiClient.get(`/admin/super-admin/archive?${queryParams}`);
    return response.data;
  },

  restoreArchived: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/admin/super-admin/archive/${id}/restore`);
    return response.data;
  },

  deleteArchived: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/super-admin/archive/${id}`);
    return response.data;
  },

  // ========== REPORTS ==========

  generateReports: async (params: {
    reportType: 'farmers' | 'cattle' | 'all';
    startDate?: string;
    endDate?: string;
    state?: string;
    format?: 'excel' | 'csv';
  }): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/reports/generate', params);
    return response.data;
  },

  // ========== NOTIFICATIONS ==========

  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    const response = await apiClient.get(`/admin/notifications?${queryParams}`);
    return response.data;
  },

  markNotificationRead: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/admin/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsRead: async (): Promise<any> => {
    const response = await apiClient.put('/admin/notifications/read-all');
    return response.data;
  },

  createFarmer: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
    dateOfBirth?: string;
    occupation?: string;
    address: {
      village: string;
      district: string;
      state: string;
      pinCode: string;
    };
  }): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/farmers', data);
    return response.data;
  },

  registerCattle: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/admin/super-admin/cattle', formData);
    return response.data;
  },
};

/**
 * Regional Admin API Endpoints (also available to Super Admin)
 */
export const regionalAdminAPI = {
  getDashboardStats: async (): Promise<any> => {
    const response = await apiClient.get('/admin/regional-admin/statistics');
    return response.data;
  },

  getFarmers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/regional-admin/farmers?${queryParams}`);
    return response.data;
  },

  getCattle: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/regional-admin/cattle?${queryParams}`);
    return response.data;
  },

  createFarmer: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    password: string;
    dateOfBirth?: string;
    occupation?: string;
    address: {
      village: string;
      district: string;
      state: string;
      pinCode: string;
    };
  }): Promise<any> => {
    const response = await apiClient.post('/admin/regional-admin/farmers', data);
    return response.data;
  },

  registerCattle: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/admin/regional-admin/cattle', formData);
    return response.data;
  },

  // Aliases used in some screens
  getAllFarmers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/regional-admin/farmers?${queryParams}`);
    return response.data;
  },

  getAllCattle: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    const response = await apiClient.get(`/admin/regional-admin/cattle?${queryParams}`);
    return response.data;
  },

  getFarmerById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/regional-admin/farmers/${id}`);
    return response.data;
  },

  getCattleById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/regional-admin/cattle/${id}`);
    return response.data;
  },

  searchFarmerByPhone: async (phoneNumber: string): Promise<any> => {
    const response = await apiClient.post('/admin/regional-admin/search-by-phone', { phoneNumber });
    return response.data;
  },

  deleteFarmer: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/regional-admin/farmers/${id}`);
    return response.data;
  },

  deleteCattle: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/regional-admin/cattle/${id}`);
    return response.data;
  },
};

/**
 * Common Admin API (all admin roles)
 */
export const adminAPI = {
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<any> => {
    const response = await apiClient.put('/admin/change-password', data);
    return response.data;
  },
};

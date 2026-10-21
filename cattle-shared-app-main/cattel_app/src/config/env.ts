const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  API_TIMEOUT: 300000, // 5 minutes for large file uploads (12 images)
};

export default ENV;
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER: '@user_data',
  ADMIN: '@admin_data',
};

export const saveToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.TOKEN, token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(KEYS.TOKEN);
};

export const saveRefreshToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
};

export const saveUser = async (user: any): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
  const user = await AsyncStorage.getItem(KEYS.USER);
  return user ? JSON.parse(user) : null;
};

export const clearToken = async (): Promise<void> => {
  await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.REFRESH_TOKEN, KEYS.USER, KEYS.ADMIN]);
};

export const clearStorage = async (): Promise<void> => {
  // Clear all auth-related data including userType, adminRole, etc.
  await AsyncStorage.multiRemove([
    KEYS.TOKEN,
    KEYS.REFRESH_TOKEN,
    KEYS.USER,
    KEYS.ADMIN,
    'userType',
    'adminRole',
    'adminData',
  ]);
};
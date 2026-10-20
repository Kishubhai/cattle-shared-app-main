export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  occupation: string;
  address: {
    houseAndStreet: string;
    district: string;
    state: string;
    country: string;
    pinCode: string;
  };
  location: {
    coordinates: [number, number];
  };
  profileImage?: string;
}

export interface LoginData {
  mobileNumber: string;
  password: string;
}

export interface OTPLoginData {
  mobileNumber: string;
  otp: string;
}

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user?: any;
    admin?: any;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  profileImage?: string;
  role: 'user' | 'farmer';
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}
// ============================================================
// REGIONAL ADMIN REGISTRATION SCREEN
// File: app/register-admin.tsx
// CREATE THIS NEW FILE
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import apiClient from '../src/api/client';

// Indian States
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function RegisterAdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);

  // Error States
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const newErrors: any = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    if (!region) newErrors.region = 'Region (State) is required';

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/admin/register', {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        region,
        role: 'regional_admin',
      });

      Toast.show({
        type: 'success',
        text1: 'Registration Submitted',
        text2: 'Your registration is pending Super Admin approval',
        visibilityTime: 5000,
      });

      // Navigate back to login after 2 seconds
      setTimeout(() => {
        router.replace('/login');
      }, 2000);

    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="px-6 pt-8">
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mb-6 flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="#3B82F6" />
              <Text className="text-blue-600 text-base font-medium ml-2">
                Back to Login
              </Text>
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Regional Admin Registration
              </Text>
              <Text className="text-gray-600 text-base">
                Register as a Regional Admin. Your account will be activated after Super Admin approval.
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* First Name */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">First Name *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e: any) => {
                      setFirstName(e.target.value);
                      setErrors({ ...errors, firstName: '' });
                    }}
                  />
                </View>
                {errors.firstName && (
                  <Text className="text-red-500 text-sm mt-1">{errors.firstName}</Text>
                )}
              </View>

              {/* Last Name */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Last Name *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e: any) => {
                      setLastName(e.target.value);
                      setErrors({ ...errors, lastName: '' });
                    }}
                  />
                </View>
                {errors.lastName && (
                  <Text className="text-red-500 text-sm mt-1">{errors.lastName}</Text>
                )}
              </View>

              {/* Email */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Email *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e: any) => {
                      setEmail(e.target.value.toLowerCase());
                      setErrors({ ...errors, email: '' });
                    }}
                  />
                </View>
                {errors.email && (
                  <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
                )}
              </View>

              {/* Phone Number */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Phone Number *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter 10-digit phone number"
                    value={phoneNumber}
                    onChange={(e: any) => {
                      setPhoneNumber(e.target.value);
                      setErrors({ ...errors, phoneNumber: '' });
                    }}
                    maxLength={10}
                  />
                </View>
                {errors.phoneNumber && (
                  <Text className="text-red-500 text-sm mt-1">{errors.phoneNumber}</Text>
                )}
              </View>

              {/* Region (State) */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Region (State) *</Text>
                <TouchableOpacity
                  onPress={() => setShowStatePicker(!showStatePicker)}
                  className={`flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border ${errors.region ? 'border-red-500' : 'border-gray-200'}`}
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                    <Text className={`ml-3 text-base ${region ? 'text-gray-900' : 'text-gray-400'}`}>
                      {region || 'Select your region'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                {errors.region && (
                  <Text className="text-red-500 text-sm mt-1">{errors.region}</Text>
                )}

                {/* State Picker */}
                {showStatePicker && (
                  <View className="bg-white border border-gray-200 rounded-xl mt-2 max-h-60">
                    <ScrollView>
                      {INDIAN_STATES.map((state) => (
                        <TouchableOpacity
                          key={state}
                          onPress={() => {
                            setRegion(state);
                            setShowStatePicker(false);
                            setErrors({ ...errors, region: '' });
                          }}
                          className="px-4 py-3 border-b border-gray-100"
                        >
                          <Text className="text-gray-900 text-base">{state}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Password */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Password *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.password ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Enter password (min 8 characters)"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e: any) => {
                      setPassword(e.target.value);
                      setErrors({ ...errors, password: '' });
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text className="text-red-500 text-sm mt-1">{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Confirm Password *</Text>
                <View className={`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                  <input
                    className="flex-1 ml-3 text-gray-900 text-base"
                    placeholder="Re-enter password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e: any) => {
                      setConfirmPassword(e.target.value);
                      setErrors({ ...errors, confirmPassword: '' });
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Info Box */}
              <View className="bg-blue-50 p-4 rounded-xl border border-blue-200 mt-4">
                <View className="flex-row">
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <View className="flex-1 ml-2">
                    <Text className="text-blue-900 font-semibold mb-1">
                      Approval Required
                    </Text>
                    <Text className="text-blue-800 text-sm">
                      Your registration will be reviewed by a Super Admin. You'll receive a notification once approved.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                className={`rounded-xl py-4 mt-6 ${loading ? 'bg-gray-400' : 'bg-green-600'}`}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center text-base font-bold">
                    Submit Registration
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back to Login */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-gray-600">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text className="text-blue-600 font-semibold">Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
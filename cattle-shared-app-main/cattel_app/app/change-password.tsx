import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../src/api/endpoints/user';
import { adminAPI } from '../src/api/endpoints/admin';
import { getErrorToast } from '../src/utils/errorHandler';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Required Fields', text2: 'Please fill all password fields' });
      return;
    }

    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: 'Invalid Password', text2: 'New password must be at least 8 characters' });
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: 'Must include uppercase, lowercase, number, and special character',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Password Mismatch', text2: 'New passwords do not match' });
      return;
    }

    try {
      setLoading(true);
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'admin') {
        await adminAPI.changePassword({ currentPassword, newPassword });
      } else {
        await userAPI.changePassword({ currentPassword, newPassword, confirmPassword });
      }
      Toast.show({ type: 'success', text1: 'Success', text2: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'general');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">Change Password</Text>
        </View>

        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          {/* Info Box */}
          <View className="bg-blue-50 rounded-xl p-4 mb-6 flex-row">
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text className="flex-1 text-sm text-blue-900 ml-3">
              Your new password must be at least 8 characters and include an uppercase letter,
              a lowercase letter, a number, and a special character (@$!%*?&).
            </Text>
          </View>

          {/* Current Password */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Current Password</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
                className="flex-1 ml-3 text-gray-900 text-sm"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-700 mb-2">New Password</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                className="flex-1 ml-3 text-gray-900 text-sm"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Confirm New Password</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                className="flex-1 ml-3 text-gray-900 text-sm"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View className="mb-6">
            <Text className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</Text>
            <RequirementItem text="At least 8 characters" met={hasMinLength} />
            <RequirementItem text="Contains an uppercase letter (A-Z)" met={hasUpper} />
            <RequirementItem text="Contains a lowercase letter (a-z)" met={hasLower} />
            <RequirementItem text="Contains a number (0-9)" met={hasNumber} />
            <RequirementItem text="Contains a special character (@$!%*?&)" met={hasSpecial} />
            <RequirementItem text="Passwords match" met={passwordsMatch} />
          </View>

          {/* Change Button */}
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={loading}
            className="bg-blue-600 rounded-xl py-4 flex-row items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text className="text-white font-bold text-base ml-2">Change Password</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const RequirementItem = ({ text, met }: { text: string; met: boolean }) => (
  <View className="flex-row items-center mb-2">
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={met ? '#10B981' : '#9CA3AF'}
    />
    <Text className={`text-xs ml-2 ${met ? 'text-green-700' : 'text-gray-600'}`}>{text}</Text>
  </View>
);

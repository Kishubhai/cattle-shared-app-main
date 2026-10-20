import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import OTPInput from '../../components/auth/OTPInput';
import { getErrorToast } from '../../utils/errorHandler';
import { authAPI } from '../../api/endpoints/auth';
import { validateMobile, validatePassword } from '../../utils/validation';

type Step = 'mobile' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('mobile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Data
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Errors
  const [errors, setErrors] = useState<any>({});

  const handleRequestOTP = async () => {
    // Validate mobile
    if (!mobileNumber.trim()) {
      setErrors({ mobileNumber: 'Mobile number is required' });
      return;
    }
    if (!validateMobile(mobileNumber)) {
      setErrors({ mobileNumber: 'Invalid mobile number (10 digits required)' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.requestPasswordResetOTP(mobileNumber);
      setCurrentStep('otp');
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: `OTP sent to ${mobileNumber}`,
      });
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'otp');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (otpCode: string) => {
    setOtp(otpCode);
    setCurrentStep('password');
  };

  const handleResetPassword = async () => {
    // Validate password
    const newErrors: any = {};
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        mobileNumber,
        otp,
        password,
        confirmPassword,
      });

      Toast.show({
        type: 'success',
        text1: 'Password Reset Successful',
        text2: 'You can now login with your new password',
      });

      router.replace('/login');
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'password_reset');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const renderMobileStep = () => (
    <>
      <View className="mb-8">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6 mx-auto">
          <Text className="text-4xl">🔐</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
          Forgot Password?
        </Text>
        <Text className="text-gray-600 text-center">
          Enter your mobile number to receive an OTP
        </Text>
      </View>

      <Input
        label="Mobile Number"
        placeholder="Enter your mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        value={mobileNumber}
        onChangeText={(text) => {
          setMobileNumber(text);
          setErrors({});
        }}
        error={errors.mobileNumber}
        icon={<Text className="text-gray-400">📱</Text>}
      />

      <Button title="Send OTP" onPress={handleRequestOTP} loading={loading} />
    </>
  );

  const renderOTPStep = () => (
    <>
      <View className="mb-8">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6 mx-auto">
          <Text className="text-4xl">📱</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
          Enter OTP
        </Text>
        <Text className="text-gray-600 text-center">
          We've sent a 6-digit code to {mobileNumber}
        </Text>
      </View>

      <View className="mb-6">
        <OTPInput onComplete={handleVerifyOTP} error={errors.otp} />
      </View>

      <Pressable onPress={handleRequestOTP} className="mb-4">
        <Text className="text-blue-600 text-center font-medium">Resend OTP</Text>
      </Pressable>

      <Button
        title="Change Number"
        onPress={() => setCurrentStep('mobile')}
        variant="outline"
      />
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View className="mb-8">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6 mx-auto">
          <Text className="text-4xl">🔑</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
          Create New Password
        </Text>
        <Text className="text-gray-600 text-center">
          Choose a strong password for your account
        </Text>
      </View>

      <Input
        label="New Password"
        placeholder="Enter new password"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrors({ ...errors, password: '' });
        }}
        error={errors.password}
        icon={<Text className="text-gray-400">🔒</Text>}
        rightIcon={<Text className="text-gray-400">{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
        onRightIconPress={() => setShowPassword(!showPassword)}
      />

      <Input
        label="Confirm Password"
        placeholder="Re-enter new password"
        secureTextEntry={!showConfirmPassword}
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setErrors({ ...errors, confirmPassword: '' });
        }}
        error={errors.confirmPassword}
        icon={<Text className="text-gray-400">🔒</Text>}
        rightIcon={
          <Text className="text-gray-400">{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
        }
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      <View className="bg-blue-50 p-4 rounded-xl mb-6">
        <Text className="text-xs text-blue-800 font-medium mb-1">Password Requirements:</Text>
        <Text className="text-xs text-blue-700">• At least 8 characters</Text>
        <Text className="text-xs text-blue-700">• One uppercase & one lowercase letter</Text>
        <Text className="text-xs text-blue-700">• One number and one special character</Text>
      </View>

      <Button title="Reset Password" onPress={handleResetPassword} loading={loading} />
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-8">
            {/* Back Button */}
            <Pressable onPress={() => router.back()} className="mb-6">
              <Text className="text-blue-600 text-base font-medium">← Back to Login</Text>
            </Pressable>

            {/* Progress Indicator */}
            <View className="flex-row justify-center mb-8">
              <View
                className={`w-2 h-2 rounded-full mx-1 ${
                  currentStep === 'mobile' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
              <View
                className={`w-2 h-2 rounded-full mx-1 ${
                  currentStep === 'otp' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
              <View
                className={`w-2 h-2 rounded-full mx-1 ${
                  currentStep === 'password' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            </View>

            {/* Render Current Step */}
            {currentStep === 'mobile' && renderMobileStep()}
            {currentStep === 'otp' && renderOTPStep()}
            {currentStep === 'password' && renderPasswordStep()}

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Remember your password? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text className="text-blue-600 font-semibold">Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
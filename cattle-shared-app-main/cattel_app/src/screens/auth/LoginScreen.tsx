import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { authAPI } from '../../api/endpoints/auth';
import OTPInput from '../../components/auth/OTPInput';
import Button from '../../components/common/Button';
import Input from '../../components/common/InputStyled';
import { saveRefreshToken, saveToken, saveUser } from '../../utils/storage';
import { getErrorToast } from '../../utils/errorHandler';

type LoginMethod = 'password' | 'otp' | 'admin';

export default function LoginScreen() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Form states
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset OTP state when switching away from OTP method
  React.useEffect(() => {
    if (loginMethod !== 'otp') setOtpSent(false);
    setErrors({});
  }, [loginMethod]);

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    if (!mobileNumber) newErrors.mobileNumber = 'Mobile number is required';
    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber))
      newErrors.mobileNumber = 'Enter a valid 10-digit mobile number';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors: Record<string, string> = {};
    if (!mobileNumber) newErrors.mobileNumber = 'Mobile number is required';
    if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber))
      newErrors.mobileNumber = 'Enter a valid 10-digit mobile number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAdmin = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Shared helper to persist auth data
  const saveAuthData = async (tokens: any, user: any, type: string, role?: string) => {
    await saveToken(tokens.accessToken);
    await saveRefreshToken(tokens.refreshToken);
    await saveUser(user);
    await AsyncStorage.setItem('userType', type);
    if (role) await AsyncStorage.setItem('adminRole', role);
    if (type === 'admin') await AsyncStorage.setItem('adminData', JSON.stringify(user));
  };

  const handlePasswordLogin = async () => {
    if (!validatePassword()) return;
    setLoading(true);
    try {
      const response = await authAPI.login({ mobileNumber, password });
      await saveAuthData(response.data.tokens, response.data.user, 'user');
      Toast.show({ type: 'success', text1: 'Login Successful', text2: `Welcome back, ${response.data.user.firstName}!` });
      setTimeout(() => router.replace('/(user)/home'), 100);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'login');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!validateOTP()) return;
    setLoading(true);
    try {
      const response = await authAPI.requestOTP(mobileNumber);
      setOtpSent(true);
      if (response.otpAlreadySent) {
        const mins = Math.ceil((response.remainingSeconds || 0) / 60);
        Toast.show({ type: 'info', text1: 'OTP Already Sent', text2: `Check your SMS. Expires in ${mins} min.` });
      } else {
        Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Enter the 6-digit code sent to your mobile.' });
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        const waitMsg = error.response?.data?.message || 'Too many OTP requests. Wait before trying again.';
        Toast.show({ type: 'error', text1: 'Rate Limited', text2: `${waitMsg}  [AUTH-429]`, visibilityTime: 5000 });
      } else {
        const { text1, text2 } = getErrorToast(error, 'otp');
        Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (otpCode: string) => {
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ mobileNumber, otp: otpCode });
      await saveAuthData(response.data.tokens, response.data.user, 'user');
      Toast.show({ type: 'success', text1: 'Login Successful', text2: `Welcome back, ${response.data.user.firstName}!` });
      setTimeout(() => router.replace('/(user)/home'), 100);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'otp');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!validateAdmin()) return;
    setLoading(true);
    try {
      const response = await authAPI.adminLogin({ email, password });
      const admin = response.data.admin;
      await saveAuthData(response.data.tokens, admin, 'admin', admin.role);
      Toast.show({ type: 'success', text1: 'Login Successful', text2: `Welcome, ${admin.firstName}!` });
      setTimeout(() => {
        if (admin.role === 'super_admin') {
          router.replace('/(super-admin)');
        } else if (admin.role === 'regional_admin') {
          router.replace('/(regional-admin)');
        } else if (admin.role === 'm_admin') {
          // m_admin uses the web portal; show a message on the app
          Toast.show({
            type: 'info',
            text1: 'Use Web Portal',
            text2: 'M-Admin accounts should use the web portal at your assigned URL.',
          });
        } else {
          router.replace('/');
        }
      }, 100);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'login');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => {
    switch (loginMethod) {
      case 'password':
        return (
          <View>
            <Input
              label="Mobile Number"
              placeholder="Enter your 10-digit mobile number"
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={(text) => { setMobileNumber(text); setErrors({ ...errors, mobileNumber: '' }); }}
              error={errors.mobileNumber}
              maxLength={10}
              icon={<Text style={styles.iconText}>📱</Text>}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
              error={errors.password}
              icon={<Text style={styles.iconText}>🔒</Text>}
              rightIcon={<Text style={styles.iconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
            <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>
            <Button title="Login" onPress={handlePasswordLogin} loading={loading} />
          </View>
        );

      case 'otp':
        return (
          <View>
            {!otpSent ? (
              <View>
                <Input
                  label="Mobile Number"
                  placeholder="Enter your 10-digit mobile number"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={(text) => { setMobileNumber(text); setErrors({ ...errors, mobileNumber: '' }); }}
                  error={errors.mobileNumber}
                  maxLength={10}
                  icon={<Text style={styles.iconText}>📱</Text>}
                />
                <Button title="Send OTP" onPress={handleRequestOTP} loading={loading} />
              </View>
            ) : (
              <View>
                <Text style={styles.otpInfoText}>Enter the 6-digit OTP sent to {mobileNumber}</Text>

                <OTPInput onComplete={handleOTPLogin} error={errors.otp} />

                <Pressable onPress={() => setOtpSent(false)} style={styles.changeNumberButton}>
                  <Text style={styles.changeNumberText}>Change Mobile Number</Text>
                </Pressable>

                <Pressable onPress={handleRequestOTP} disabled={loading} style={styles.resendButton}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </Pressable>
              </View>
            )}
          </View>
        );

      case 'admin':
        return (
          <View>
            <Input
              label="Admin Email"
              placeholder="Enter your admin email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
              error={errors.email}
              icon={<Text style={styles.iconText}>✉️</Text>}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
              error={errors.password}
              icon={<Text style={styles.iconText}>🔒</Text>}
              rightIcon={<Text style={styles.iconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
            <View style={styles.adminWarning}>
              <Text style={styles.adminWarningText}>
                ⚠️ Admin access only. Contact system administrator for credentials.
              </Text>
            </View>
            <Button title="Admin Login" onPress={handleAdminLogin} loading={loading} />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your account</Text>

            {/* Login Method Tabs */}
            <View style={styles.tabContainer}>
              {(['password', 'otp', 'admin'] as LoginMethod[]).map((method) => (
                <Pressable
                  key={method}
                  onPress={() => setLoginMethod(method)}
                  style={[styles.tab, loginMethod === method && styles.tabActive]}
                >
                  <Text style={[styles.tabText, loginMethod === method && styles.tabTextActive]}>
                    {method === 'password' ? 'Password' : method === 'otp' ? 'OTP' : 'Admin'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View key={loginMethod}>
              {renderLoginForm()}
            </View>

            {loginMethod !== 'admin' && (
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/signup')}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6' },
  iconText: { color: '#9CA3AF' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },
  otpInfoText: { color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  changeNumberButton: { marginTop: 16, alignItems: 'center' },
  changeNumberText: { color: '#3B82F6', fontSize: 14 },
  resendButton: { marginTop: 8, alignItems: 'center' },
  resendText: { color: '#6B7280', fontSize: 14 },
  adminWarning: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 24 },
  adminWarningText: { fontSize: 12, color: '#92400E' },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { color: '#6B7280' },
  signupLink: { color: '#3B82F6', fontWeight: '600' },
});

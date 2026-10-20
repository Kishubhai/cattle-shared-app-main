import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { authAPI } from '../../api/endpoints/auth';
import Button from '../../components/common/Button';
import ImagePickerComponent from '../../components/common/ImagePicker';
import Input from '../../components/common/Input';
import ENV from '../../config/env';
import { saveRefreshToken, saveToken, saveUser } from '../../utils/storage';
import { validateEmail, validateMobile, validatePassword, validatePinCode } from '../../utils/validation';
import { getErrorToast } from '../../utils/errorHandler';
import axios from 'axios';

// ─── Reusable modal dropdown ───────────────────────────────────────────────────
interface DropdownModalProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (v: string) => void;
  error?: string;
  disabled?: boolean;
}

function DropdownModal({ label, value, placeholder, options, onSelect, error, disabled }: DropdownModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrapper}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity
        style={[dd.trigger, error ? dd.triggerError : null, disabled ? dd.triggerDisabled : null]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[dd.triggerText, !value ? dd.placeholder : null]}>
          {value || placeholder}
        </Text>
        <Text style={{ fontSize: 12, color: disabled ? '#D1D5DB' : '#6B7280' }}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={dd.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dd.overlay} onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dd.item, item === value ? dd.itemSelected : null]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[dd.itemText, item === value ? dd.itemTextSelected : null]}>
                    {item}
                  </Text>
                  {item === value ? <Text style={{ color: '#3B82F6' }}>✓</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const dd = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  triggerError: { borderColor: '#EF4444' },
  triggerDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  triggerText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  item: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemSelected: { backgroundColor: '#EFF6FF' },
  itemText: { fontSize: 15, color: '#374151', flex: 1 },
  itemTextSelected: { color: '#3B82F6', fontWeight: '600' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Date of birth parts
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Location data
  const [states, setStates] = useState<{ name: string; code: string }[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    occupation: '',
    profileImage: '',
    address: {
      houseAndStreet: '',
      village: '',
      district: '',
      state: '',
      country: 'India',
      pinCode: '',
    },
    location: { coordinates: [0, 0] as [number, number] },
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    requestLocationPermission();
    loadStates();
  }, []);

  useEffect(() => {
    if (formData.address.state) {
      loadDistricts(formData.address.state);
    } else {
      setDistricts([]);
    }
  }, [formData.address.state]);

  const loadStates = async () => {
    setLoadingStates(true);
    try {
      const res = await axios.get(`${ENV.API_BASE_URL}/locations/state-names`);
      if (res.data?.success) setStates(res.data.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load states', text2: 'Check your internet connection' });
    } finally {
      setLoadingStates(false);
    }
  };

  const loadDistricts = async (stateName: string) => {
    setLoadingDistricts(true);
    setDistricts([]);
    try {
      const res = await axios.get(`${ENV.API_BASE_URL}/locations/states/${encodeURIComponent(stateName)}/districts`);
      if (res.data?.success) setDistricts(res.data.data.districts ?? []);
    } catch {
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setFormData(prev => ({
          ...prev,
          location: { coordinates: [loc.coords.longitude, loc.coords.latitude] },
        }));
      } else {
        Toast.show({
          type: 'info',
          text1: 'Location Not Captured',
          text2: 'Enable location permission in device settings for location-based features.',
          visibilityTime: 4000,
        });
      }
    } catch {
      Toast.show({
        type: 'info',
        text1: 'Location Unavailable',
        text2: 'Could not detect your location. You can still complete registration.',
      });
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    setErrors((prev: any) => ({ ...prev, address: { ...(prev.address ?? {}), [field]: '' } }));
  };

  // ── DOB helpers ─────────────────────────────────────────────────────────────
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const YEARS = Array.from({ length: 76 }, (_, i) => String(2005 - i)); // 2005 down to 1930

  const getDaysForMonth = (month: string, year: string) => {
    const mIdx = MONTHS.indexOf(month);
    if (mIdx === -1) return Array.from({ length: 31 }, (_, i) => String(i + 1));
    const y = year ? parseInt(year) : 2000;
    const count = new Date(y, mIdx + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => String(i + 1));
  };

  const updateDob = (month: string, day: string, year: string) => {
    if (month && day && year) {
      const mIdx = MONTHS.indexOf(month) + 1;
      const mm = String(mIdx).padStart(2, '0');
      const dd2 = day.padStart(2, '0');
      updateField('dateOfBirth', `${year}-${mm}-${dd2}`);
    } else {
      updateField('dateOfBirth', '');
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e: any = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!validateEmail(formData.email)) e.email = 'Invalid email address';
    if (!formData.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    else if (!validateMobile(formData.mobileNumber)) e.mobileNumber = 'Invalid mobile number (10 digits)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: any = {};
    if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (!formData.occupation.trim()) e.occupation = 'Occupation is required';
    const passErr = validatePassword(formData.password);
    if (passErr) e.password = passErr;
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: any = { address: {} };
    if (!formData.address.houseAndStreet.trim()) e.address.houseAndStreet = 'Address is required';
    if (!formData.address.state.trim()) e.address.state = 'State is required';
    if (!formData.address.district.trim()) e.address.district = 'District is required';
    if (!formData.address.pinCode.trim()) e.address.pinCode = 'Pin code is required';
    else if (!validatePinCode(formData.address.pinCode)) e.address.pinCode = 'Invalid pin code (6 digits)';
    setErrors(e);
    return Object.keys(e.address).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
  };

  const handleSignup = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    try {
      const signupData = {
        ...formData,
        profileImage: formData.profileImage?.startsWith('file://') ? undefined : formData.profileImage,
      };
      const response = await authAPI.signup(signupData as any);
      await saveToken(response.data.tokens.accessToken);
      await saveRefreshToken(response.data.tokens.refreshToken);
      await saveUser(response.data.user);
      await AsyncStorage.setItem('userType', 'user');
      Toast.show({ type: 'success', text1: 'Signup Successful!', text2: `Welcome, ${response.data.user.firstName}!` });
      setTimeout(() => router.replace('/(user)/home'), 1000);
    } catch (error: any) {
      let text1: string, text2: string;
      if (error.response?.status === 409) {
        text1 = 'Account Already Exists';
        text2 = 'An account with this email or mobile already exists.  [AUTH-409]';
      } else {
        ({ text1, text2 } = getErrorToast(error, 'signup'));
      }
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <View style={s.progressWrapper}>
      <View style={s.progressHeader}>
        <Text style={s.progressStep}>Step {currentStep} of 3</Text>
        <Text style={s.progressLabel}>
          {currentStep === 1 ? 'Personal Info' : currentStep === 2 ? 'Account Details' : 'Address'}
        </Text>
      </View>
      <View style={s.progressTrack}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={[s.progressSegment, step <= currentStep ? s.progressActive : s.progressInactive]} />
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={s.stepTitle}>Personal Information</Text>
      <Text style={s.stepSubtitle}>Let's start with your basic details</Text>

      <ImagePickerComponent
        label="Profile Photo (Optional)"
        onImageSelect={(uri) => updateField('profileImage', uri)}
        imageUri={formData.profileImage}
      />

      <Input label="First Name" placeholder="Enter your first name" value={formData.firstName}
        onChangeText={(t) => updateField('firstName', t)} error={errors.firstName}
        icon={<Text style={s.icon}>👤</Text>} />

      <Input label="Last Name" placeholder="Enter your last name" value={formData.lastName}
        onChangeText={(t) => updateField('lastName', t)} error={errors.lastName}
        icon={<Text style={s.icon}>👤</Text>} />

      <Input label="Email" placeholder="Enter your email" keyboardType="email-address"
        autoCapitalize="none" value={formData.email}
        onChangeText={(t) => updateField('email', t)} error={errors.email}
        icon={<Text style={s.icon}>✉️</Text>} />

      <Input label="Mobile Number" placeholder="10-digit mobile number" keyboardType="phone-pad"
        maxLength={10} value={formData.mobileNumber}
        onChangeText={(t) => updateField('mobileNumber', t)} error={errors.mobileNumber}
        icon={<Text style={s.icon}>📱</Text>} />
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={s.stepTitle}>Account Details</Text>
      <Text style={s.stepSubtitle}>Set up your account credentials</Text>

      {/* ── Date of Birth (3-part dropdown) ── */}
      <View style={s.fieldWrapper}>
        <Text style={s.fieldLabel}>Date of Birth *</Text>
        <View style={s.dobRow}>
          <View style={{ flex: 2, marginRight: 6 }}>
            <DropdownModal
              label=""
              value={dobMonth}
              placeholder="Month"
              options={MONTHS}
              onSelect={(v) => {
                setDobMonth(v);
                // Reset day if it exceeds new month's max
                const days = getDaysForMonth(v, dobYear);
                const newDay = dobDay && parseInt(dobDay) > days.length ? '' : dobDay;
                setDobDay(newDay);
                updateDob(v, newDay, dobYear);
              }}
              error={undefined}
            />
          </View>
          <View style={{ flex: 1, marginRight: 6 }}>
            <DropdownModal
              label=""
              value={dobDay}
              placeholder="Day"
              options={getDaysForMonth(dobMonth, dobYear)}
              onSelect={(v) => { setDobDay(v); updateDob(dobMonth, v, dobYear); }}
              error={undefined}
              disabled={!dobMonth}
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <DropdownModal
              label=""
              value={dobYear}
              placeholder="Year"
              options={YEARS}
              onSelect={(v) => { setDobYear(v); updateDob(dobMonth, dobDay, v); }}
              error={undefined}
            />
          </View>
        </View>
        {errors.dateOfBirth ? <Text style={s.errorText}>{errors.dateOfBirth}</Text> : null}
      </View>

      <Input label="Occupation" placeholder="e.g. Farmer, Agricultural Worker"
        value={formData.occupation} onChangeText={(t) => updateField('occupation', t)}
        error={errors.occupation} icon={<Text style={s.icon}>💼</Text>} />

      <Input label="Password" placeholder="Create a strong password"
        secureTextEntry={!showPassword} value={formData.password}
        onChangeText={(t) => updateField('password', t)} error={errors.password}
        icon={<Text style={s.icon}>🔒</Text>}
        rightIcon={<Text style={s.icon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>}
        onRightIconPress={() => setShowPassword(!showPassword)} />

      <Input label="Confirm Password" placeholder="Re-enter your password"
        secureTextEntry={!showConfirmPassword} value={formData.confirmPassword}
        onChangeText={(t) => updateField('confirmPassword', t)} error={errors.confirmPassword}
        icon={<Text style={s.icon}>🔒</Text>}
        rightIcon={<Text style={s.icon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)} />

      <View style={s.passwordHint}>
        <Text style={s.passwordHintTitle}>Password Requirements:</Text>
        <Text style={s.passwordHintItem}>• At least 8 characters</Text>
        <Text style={s.passwordHintItem}>• One uppercase and one lowercase letter</Text>
        <Text style={s.passwordHintItem}>• One number and one special character</Text>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={s.stepTitle}>Address Information</Text>
      <Text style={s.stepSubtitle}>Where can we reach you?</Text>

      <Input label="House / Street Address *" placeholder="Enter your house number and street"
        value={formData.address.houseAndStreet}
        onChangeText={(t) => updateAddress('houseAndStreet', t)}
        error={errors.address?.houseAndStreet}
        icon={<Text style={s.icon}>🏠</Text>} />

      <Input label="Village / Town" placeholder="Enter your village or town name"
        value={formData.address.village}
        onChangeText={(t) => updateAddress('village', t)}
        icon={<Text style={s.icon}>🏘️</Text>} />

      <DropdownModal
        label="State *"
        value={formData.address.state}
        placeholder={loadingStates ? 'Loading states...' : 'Select your state'}
        options={states.map(s => s.name)}
        onSelect={(v) => { updateAddress('state', v); updateAddress('district', ''); }}
        error={errors.address?.state}
        disabled={loadingStates}
      />

      <DropdownModal
        label="District *"
        value={formData.address.district}
        placeholder={
          !formData.address.state ? 'Select a state first' :
          loadingDistricts ? 'Loading districts...' :
          'Select your district'
        }
        options={districts}
        onSelect={(v) => updateAddress('district', v)}
        error={errors.address?.district}
        disabled={!formData.address.state || loadingDistricts}
      />

      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Input label="Country" value={formData.address.country} editable={false}
            icon={<Text style={s.icon}>🌍</Text>} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Pin Code *" placeholder="6-digit pin code" keyboardType="number-pad"
            maxLength={6} value={formData.address.pinCode}
            onChangeText={(t) => updateAddress('pinCode', t)}
            error={errors.address?.pinCode}
            icon={<Text style={s.icon}>📮</Text>} />
        </View>
      </View>

      {formData.location.coordinates[0] !== 0 ? (
        <View style={s.locationBanner}>
          <Text style={s.locationText}>✓ Location detected successfully</Text>
        </View>
      ) : (
        <View style={[s.locationBanner, { backgroundColor: '#FEF9C3' }]}>
          <Text style={[s.locationText, { color: '#854D0E' }]}>
            ⚠ Location not captured — enable location permission for full features
          </Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Pressable onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </Pressable>

            {renderProgressBar()}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            <View style={s.navButtons}>
              {currentStep < 3 ? (
                <>
                  <Button title="Continue" onPress={handleNextStep} />
                  {currentStep > 1 && (
                    <View style={{ marginTop: 12 }}>
                      <Button title="Previous" onPress={() => setCurrentStep(currentStep - 1)} variant="outline" />
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Button title="Create Account" onPress={handleSignup} loading={loading} />
                  <View style={{ marginTop: 12 }}>
                    <Button title="Previous" onPress={() => setCurrentStep(currentStep - 1)} variant="outline" />
                  </View>
                </>
              )}
            </View>

            <View style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={s.loginLink}>Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  backBtn: { marginBottom: 24 },
  backText: { color: '#3B82F6', fontSize: 16, fontWeight: '500' },
  progressWrapper: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressStep: { fontSize: 13, fontWeight: '600', color: '#374151' },
  progressLabel: { fontSize: 13, color: '#6B7280' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 8, borderRadius: 4 },
  progressActive: { backgroundColor: '#3B82F6' },
  progressInactive: { backgroundColor: '#E5E7EB' },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  icon: { fontSize: 16 },
  // Date picker
  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  dobRow: { flexDirection: 'row', alignItems: 'flex-start' },
  placeholder: { color: '#9CA3AF' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  // Password hint
  passwordHint: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16 },
  passwordHintTitle: { fontSize: 13, fontWeight: '600', color: '#1E40AF', marginBottom: 6 },
  passwordHintItem: { fontSize: 12, color: '#1D4ED8', lineHeight: 20 },
  // Address
  row: { flexDirection: 'row' },
  locationBanner: { backgroundColor: '#F0FDF4', padding: 14, borderRadius: 12, marginTop: 4 },
  locationText: { fontSize: 13, color: '#166534', fontWeight: '500' },
  // Navigation
  navButtons: { marginTop: 24 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
});

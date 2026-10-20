import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { regionalAdminAPI } from '../../src/api/endpoints/admin';
import { getUser } from '../../src/utils/storage';

export default function AddFarmerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [adminJurisdiction, setAdminJurisdiction] = useState<{ state: string; district: string }>({ state: '', district: '' });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    dateOfBirth: '',
    occupation: 'Farmer',
    address: {
      houseAndStreet: '',
      village: '',
      district: '',
      state: '',
      pinCode: '',
    },
  });

  const [errors, setErrors] = useState<any>({});

  // Load the admin's jurisdiction from stored profile and lock state+district
  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        const state = user?.assignedRegion?.state ?? '';
        const district = user?.assignedRegion?.district ?? '';
        setAdminJurisdiction({ state, district });
        setFormData(prev => ({
          ...prev,
          address: { ...prev.address, state, district },
        }));
      }
    });
  }, []);

  const validate = () => {
    const newErrors: any = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Mobile number must be 10 digits';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.address.houseAndStreet.trim()) newErrors.houseAndStreet = 'House and street is required';
    if (!formData.address.village.trim()) newErrors.village = 'Village is required';
    if (!formData.address.pinCode.trim()) newErrors.pinCode = 'Pin code is required';
    else if (!/^\d{6}$/.test(formData.address.pinCode)) newErrors.pinCode = 'Pin code must be 6 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields correctly' });
      return;
    }
    setLoading(true);
    try {
      await regionalAdminAPI.createFarmer(formData);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Farmer created successfully' });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to create farmer',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Farmer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Jurisdiction Banner */}
        {(adminJurisdiction.state || adminJurisdiction.district) ? (
          <View style={styles.jurisdictionBanner}>
            <Ionicons name="location" size={18} color="#6366F1" />
            <Text style={styles.jurisdictionText}>
              Registering farmer for{' '}
              <Text style={{ fontWeight: '700' }}>
                {adminJurisdiction.district ? `${adminJurisdiction.district}, ` : ''}{adminJurisdiction.state}
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                value={formData.firstName}
                onChangeText={(v) => updateField('firstName', v)}
                placeholder="Enter first name"
                placeholderTextColor="#9CA3AF"
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                value={formData.lastName}
                onChangeText={(v) => updateField('lastName', v)}
                placeholder="Enter last name"
                placeholderTextColor="#9CA3AF"
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="farmer@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={[styles.input, errors.mobileNumber && styles.inputError]}
            value={formData.mobileNumber}
            onChangeText={(v) => updateField('mobileNumber', v)}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#9CA3AF"
          />
          {errors.mobileNumber ? <Text style={styles.errorText}>{errors.mobileNumber}</Text> : null}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            placeholder="Minimum 6 characters"
            secureTextEntry
            placeholderTextColor="#9CA3AF"
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={formData.dateOfBirth}
            onChangeText={(v) => updateField('dateOfBirth', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Occupation</Text>
          <TextInput
            style={styles.input}
            value={formData.occupation}
            onChangeText={(v) => updateField('occupation', v)}
            placeholder="Enter occupation"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>

          <Text style={styles.label}>State</Text>
          <View style={[styles.input, styles.lockedField]}>
            <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
            <Text style={styles.lockedText}>{formData.address.state || 'Not set'}</Text>
          </View>

          <Text style={styles.label}>District</Text>
          <View style={[styles.input, styles.lockedField]}>
            <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
            <Text style={styles.lockedText}>{formData.address.district || 'Not set'}</Text>
          </View>

          <Text style={styles.label}>House & Street *</Text>
          <TextInput
            style={[styles.input, errors.houseAndStreet && styles.inputError]}
            value={formData.address.houseAndStreet}
            onChangeText={(v) => updateAddress('houseAndStreet', v)}
            placeholder="Enter house number and street name"
            placeholderTextColor="#9CA3AF"
          />
          {errors.houseAndStreet ? <Text style={styles.errorText}>{errors.houseAndStreet}</Text> : null}

          <Text style={styles.label}>Village *</Text>
          <TextInput
            style={[styles.input, errors.village && styles.inputError]}
            value={formData.address.village}
            onChangeText={(v) => updateAddress('village', v)}
            placeholder="Enter village name"
            placeholderTextColor="#9CA3AF"
          />
          {errors.village ? <Text style={styles.errorText}>{errors.village}</Text> : null}

          <Text style={styles.label}>Pin Code *</Text>
          <TextInput
            style={[styles.input, errors.pinCode && styles.inputError]}
            value={formData.address.pinCode}
            onChangeText={(v) => updateAddress('pinCode', v)}
            placeholder="6-digit pin code"
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor="#9CA3AF"
          />
          {errors.pinCode ? <Text style={styles.errorText}>{errors.pinCode}</Text> : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Creating Farmer...</Text>
            </>
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Create Farmer</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1 },
  jurisdictionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 10, gap: 8 },
  jurisdictionText: { flex: 1, fontSize: 14, color: '#4338CA', lineHeight: 18 },
  section: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  lockedField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  lockedText: { fontSize: 15, color: '#6B7280', fontStyle: 'italic' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  submitButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});

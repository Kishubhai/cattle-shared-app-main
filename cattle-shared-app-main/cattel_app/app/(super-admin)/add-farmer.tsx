import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { superAdminAPI } from '../../src/api/endpoints/admin';
import ENV from '../../src/config/env';

// ─── Reusable dropdown (same pattern as SignupScreen) ───────────────────────
function DropdownModal({ label, value, placeholder, options, onSelect, error, disabled }: {
  label: string; value: string; placeholder: string; options: string[];
  onSelect: (v: string) => void; error?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger, error ? styles.inputError : null, disabled ? styles.dropdownDisabled : null]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[{ fontSize: 16, flex: 1 }, !value ? { color: '#9CA3AF' } : { color: '#111827' }]}>
          {value || placeholder}
        </Text>
        <Text style={{ color: disabled ? '#D1D5DB' : '#6B7280' }}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                  <Text style={[dd.itemText, item === value ? dd.itemTextSelected : null]}>{item}</Text>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  item: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemSelected: { backgroundColor: '#EFF6FF' },
  itemText: { fontSize: 15, color: '#374151', flex: 1 },
  itemTextSelected: { color: '#3B82F6', fontWeight: '600' },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function AddFarmerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Location data
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', mobileNumber: '',
    password: '', dateOfBirth: '', occupation: 'Farmer',
    address: { houseAndStreet: '', village: '', district: '', state: '', pinCode: '' },
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
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
      if (res.data?.success) setStates(res.data.data.map((s: any) => s.name));
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load states' });
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

  const validate = () => {
    const e: any = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid';
    if (!formData.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    else if (!/^\d{10}$/.test(formData.mobileNumber)) e.mobileNumber = 'Mobile number must be 10 digits';
    if (!formData.password.trim()) e.password = 'Password is required';
    else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!formData.address.houseAndStreet.trim()) e.houseAndStreet = 'House and street is required';
    if (!formData.address.village.trim()) e.village = 'Village is required';
    if (!formData.address.state.trim()) e.state = 'State is required';
    if (!formData.address.district.trim()) e.district = 'District is required';
    if (!formData.address.pinCode.trim()) e.pinCode = 'Pin code is required';
    else if (!/^\d{6}$/.test(formData.address.pinCode)) e.pinCode = 'Pin code must be 6 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields correctly' });
      return;
    }
    setLoading(true);
    try {
      await superAdminAPI.createFarmer(formData);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Farmer created successfully' });
      router.back();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Failed to create farmer' });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Farmer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={[styles.input, errors.firstName && styles.inputError]} value={formData.firstName}
                onChangeText={(v) => updateField('firstName', v)} placeholder="First name" placeholderTextColor="#9CA3AF" />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput style={[styles.input, errors.lastName && styles.inputError]} value={formData.lastName}
                onChangeText={(v) => updateField('lastName', v)} placeholder="Last name" placeholderTextColor="#9CA3AF" />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput style={[styles.input, errors.email && styles.inputError]} value={formData.email}
            onChangeText={(v) => updateField('email', v)} placeholder="farmer@example.com"
            keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput style={[styles.input, errors.mobileNumber && styles.inputError]} value={formData.mobileNumber}
            onChangeText={(v) => updateField('mobileNumber', v)} placeholder="10-digit mobile number"
            keyboardType="phone-pad" maxLength={10} placeholderTextColor="#9CA3AF" />
          {errors.mobileNumber ? <Text style={styles.errorText}>{errors.mobileNumber}</Text> : null}

          <Text style={styles.label}>Password *</Text>
          <TextInput style={[styles.input, errors.password && styles.inputError]} value={formData.password}
            onChangeText={(v) => updateField('password', v)} placeholder="Minimum 8 characters"
            secureTextEntry placeholderTextColor="#9CA3AF" />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput style={styles.input} value={formData.dateOfBirth}
            onChangeText={(v) => updateField('dateOfBirth', v)} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />

          <Text style={styles.label}>Occupation</Text>
          <TextInput style={styles.input} value={formData.occupation}
            onChangeText={(v) => updateField('occupation', v)} placeholder="Enter occupation" placeholderTextColor="#9CA3AF" />
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>

          <DropdownModal
            label="State *"
            value={formData.address.state}
            placeholder={loadingStates ? 'Loading states...' : 'Select state'}
            options={states}
            onSelect={(v) => { updateAddress('state', v); updateAddress('district', ''); }}
            error={errors.state}
            disabled={loadingStates}
          />

          <DropdownModal
            label="District *"
            value={formData.address.district}
            placeholder={
              !formData.address.state ? 'Select a state first' :
              loadingDistricts ? 'Loading districts...' : 'Select district'
            }
            options={districts}
            onSelect={(v) => updateAddress('district', v)}
            error={errors.district}
            disabled={!formData.address.state || loadingDistricts}
          />

          <Text style={styles.label}>House & Street *</Text>
          <TextInput style={[styles.input, errors.houseAndStreet && styles.inputError]} value={formData.address.houseAndStreet}
            onChangeText={(v) => updateAddress('houseAndStreet', v)} placeholder="House number and street name" placeholderTextColor="#9CA3AF" />
          {errors.houseAndStreet ? <Text style={styles.errorText}>{errors.houseAndStreet}</Text> : null}

          <Text style={styles.label}>Village *</Text>
          <TextInput style={[styles.input, errors.village && styles.inputError]} value={formData.address.village}
            onChangeText={(v) => updateAddress('village', v)} placeholder="Enter village name" placeholderTextColor="#9CA3AF" />
          {errors.village ? <Text style={styles.errorText}>{errors.village}</Text> : null}

          <Text style={styles.label}>Pin Code *</Text>
          <TextInput style={[styles.input, errors.pinCode && styles.inputError]} value={formData.address.pinCode}
            onChangeText={(v) => updateAddress('pinCode', v)} placeholder="6-digit pin code"
            keyboardType="number-pad" maxLength={6} placeholderTextColor="#9CA3AF" />
          {errors.pinCode ? <Text style={styles.errorText}>{errors.pinCode}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <><ActivityIndicator color="white" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Creating Farmer...</Text></>
          ) : (
            <><Ionicons name="person-add" size={20} color="white" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Create Farmer</Text></>
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
  section: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownDisabled: { backgroundColor: '#F3F4F6' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  submitButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});

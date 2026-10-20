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
import { superAdminAPI } from '../../src/api/endpoints/admin';
import apiClient from '../../src/api/client';

interface LocationState {
  name: string;
  code: string;
}

interface DropdownProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (v: string) => void;
  error?: string;
  disabled?: boolean;
}

function Dropdown({ label, value, placeholder, options, onSelect, error, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger, error ? styles.inputError : {}, disabled ? styles.inputDisabled : {}]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.dropdownValue, !value && { color: '#9CA3AF' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? '#D1D5DB' : '#6B7280'} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === value && styles.modalItemSelected]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[styles.modalItemText, item === value && styles.modalItemTextSelected]}>
                    {item}
                  </Text>
                  {item === value && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function AddRegionalAdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    password: '',
    assignedRegion: {
      state: '',
      district: '',
    },
    jurisdictionLevel: 'district',
  });

  const [errors, setErrors] = useState<any>({});

  // Load states on mount
  useEffect(() => {
    apiClient.get('/locations/state-names')
      .then((res: any) => {
        const data = res.data?.data ?? res.data ?? [];
        setStates(data.map((s: any) => s.name ?? s));
      })
      .catch(() => {
        Toast.show({ type: 'error', text1: 'Failed to load states' });
      })
      .finally(() => setStatesLoading(false));
  }, []);

  // Load districts when state changes
  const handleStateSelect = async (stateName: string) => {
    setFormData(prev => ({
      ...prev,
      assignedRegion: { state: stateName, district: '' },
    }));
    setErrors((prev: any) => ({ ...prev, state: '', district: '' }));
    setDistricts([]);
    if (!stateName) return;

    setDistrictsLoading(true);
    try {
      const res: any = await apiClient.get(`/locations/states/${encodeURIComponent(stateName)}/districts`);
      const data = res.data?.data?.districts ?? res.data?.districts ?? [];
      setDistricts(data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load districts' });
    } finally {
      setDistrictsLoading(false);
    }
  };

  const handleDistrictSelect = (district: string) => {
    setFormData(prev => ({
      ...prev,
      assignedRegion: { ...prev.assignedRegion, district },
    }));
    setErrors((prev: any) => ({ ...prev, district: '' }));
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Mobile number must be 10 digits';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.assignedRegion.state) newErrors.state = 'State is required';
    if (!formData.assignedRegion.district) newErrors.district = 'District is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill all required fields' });
      return;
    }
    setLoading(true);
    try {
      await superAdminAPI.createRegionalAdmin(formData);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Regional Admin created successfully' });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to create regional admin',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Regional Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            placeholder="admin@example.com"
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
            placeholder="Minimum 8 characters"
            secureTextEntry
            placeholderTextColor="#9CA3AF"
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Assigned Region */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Region</Text>
          <Text style={styles.sectionHint}>
            Each Regional Admin manages a single district. They can only view and manage farmers and cattle within that district.
          </Text>

          {statesLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.loadingText}>Loading states...</Text>
            </View>
          ) : (
            <Dropdown
              label="State *"
              value={formData.assignedRegion.state}
              placeholder="Select state"
              options={states}
              onSelect={handleStateSelect}
              error={errors.state}
            />
          )}

          {districtsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.loadingText}>Loading districts...</Text>
            </View>
          ) : (
            <Dropdown
              label="District *"
              value={formData.assignedRegion.district}
              placeholder={formData.assignedRegion.state ? 'Select district' : 'Select a state first'}
              options={districts}
              onSelect={handleDistrictSelect}
              error={errors.district}
              disabled={!formData.assignedRegion.state || districts.length === 0}
            />
          )}

          {formData.assignedRegion.state && formData.assignedRegion.district ? (
            <View style={styles.summaryBox}>
              <Ionicons name="location" size={20} color="#6366F1" />
              <Text style={styles.summaryText}>
                Jurisdiction: <Text style={{ fontWeight: '700' }}>{formData.assignedRegion.district}</Text>, {formData.assignedRegion.state}
              </Text>
            </View>
          ) : null}
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
              <Text style={styles.submitButtonText}>Creating Admin...</Text>
            </>
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Create Regional Admin</Text>
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
  section: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  sectionHint: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  inputDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontSize: 16, color: '#111827', flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  summaryBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginTop: 16, gap: 8 },
  summaryText: { flex: 1, fontSize: 14, color: '#4338CA', lineHeight: 20 },
  submitButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox: { backgroundColor: 'white', borderRadius: 16, maxHeight: 400, paddingVertical: 8 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalItemSelected: { backgroundColor: '#EEF2FF' },
  modalItemText: { fontSize: 15, color: '#374151' },
  modalItemTextSelected: { color: '#6366F1', fontWeight: '600' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { userAPI } from '../src/api/endpoints/user';
import { saveUser } from '../src/utils/storage';
import { getErrorToast } from '../src/utils/errorHandler';

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [occupation, setOccupation] = useState('');
  const [houseAndStreet, setHouseAndStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data || response.user || response;

      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setDateOfBirth(userData.dateOfBirth ? new Date(userData.dateOfBirth) : new Date());
      setOccupation(userData.occupation || '');
      setHouseAndStreet(userData.address?.houseAndStreet || '');
      setDistrict(userData.address?.district || '');
      setState(userData.address?.state || '');
      setCountry(userData.address?.country || 'India');
      setPinCode(userData.address?.pinCode || '');
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'load_data');
      Toast.show({ type: 'error', text1, text2 });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'First name and last name are required' });
      return;
    }
    if (!district.trim() || !state.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'District and state are required' });
      return;
    }
    if (!pinCode.trim() || !/^[0-9]{6}$/.test(pinCode.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid PIN', text2: 'PIN code must be exactly 6 digits' });
      return;
    }

    try {
      setSaving(true);

      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
        occupation: occupation.trim(),
        address: {
          houseAndStreet: houseAndStreet.trim(),
          district: district.trim(),
          state: state.trim(),
          country: country.trim(),
          pinCode: pinCode.trim(),
        },
      };

      const response = await userAPI.updateProfile(data);

      // Update AsyncStorage so profile.tsx reflects the changes immediately
      const updatedUser = response.data || response.user || response;
      if (updatedUser?.firstName) {
        await saveUser(updatedUser);
      }

      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
      router.back();
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'general');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

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
          <Text className="text-xl font-bold text-gray-900 flex-1">Edit Profile</Text>
        </View>

        <ScrollView className="flex-1 px-4 py-5" showsVerticalScrollIndicator={false}>
          {/* Personal Information */}
          <Text className="text-base font-bold text-gray-900 mb-4">Personal Information</Text>

          <InputField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            required
          />

          <InputField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            required
          />

          {/* Date of Birth */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Date of Birth</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-gray-900 text-sm">
                {dateOfBirth.toLocaleDateString()}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <InputField
            label="Occupation"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Enter occupation"
          />

          {/* Address */}
          <Text className="text-base font-bold text-gray-900 mb-4 mt-5">Address</Text>

          <InputField
            label="House & Street"
            value={houseAndStreet}
            onChangeText={setHouseAndStreet}
            placeholder="Enter house number and street"
            multiline
          />

          <InputField
            label="District"
            value={district}
            onChangeText={setDistrict}
            placeholder="Enter district"
            required
          />

          <InputField
            label="State"
            value={state}
            onChangeText={setState}
            placeholder="Enter state"
            required
          />

          <InputField
            label="Country"
            value={country}
            onChangeText={setCountry}
            placeholder="Enter country"
          />

          <InputField
            label="PIN Code"
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="Enter 6-digit PIN code"
            keyboardType="numeric"
            maxLength={6}
            required
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-blue-600 rounded-xl py-4 mt-6 mb-8 flex-row items-center justify-center"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text className="text-white font-bold text-base ml-2">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Input Field Component
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  keyboardType = 'default',
  multiline = false,
  maxLength,
}: any) => (
  <View className="mb-4">
    <View className="flex-row items-center mb-2">
      <Text className="text-sm font-semibold text-gray-700">{label}</Text>
      {required && <Text className="text-red-600 ml-1">*</Text>}
    </View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      className={`bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 text-sm ${
        multiline ? 'py-3 min-h-[80px]' : 'py-3'
      }`}
      style={{ textAlignVertical: multiline ? 'top' : 'center' }}
    />
  </View>
);

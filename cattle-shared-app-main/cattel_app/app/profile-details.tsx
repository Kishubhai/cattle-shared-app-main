// ============================================================
// PROFILE DETAILS (VIEW ONLY)
// File: app/profile-details.tsx
// CREATE NEW FILE
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../src/api/client';
import Toast from 'react-native-toast-message';
import { getErrorToast } from '../src/utils/errorHandler';

export default function ProfileDetailsScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/users/profile');
      const userData = response.data.data || response.data.user || response.data;
      setProfile(userData);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'load_data');
      Toast.show({ type: 'error', text1, text2 });
    } finally {
      setLoading(false);
    }
  };

  const getProfileImageUrl = () => {
    if (!profile?.profilePicture?.filename) return null;
    const baseUrl = apiClient.defaults.baseURL?.replace('/api/v1', '');
    return `${baseUrl}/uploads/profiles/${profile.profilePicture.filename}`;
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
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">Profile Details</Text>
        <TouchableOpacity onPress={() => router.push('/edit-profile' as any)}>
          <Text className="text-blue-600 font-bold text-sm">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View className="items-center py-6 bg-gray-50">
          {getProfileImageUrl() ? (
            <Image
              source={{ uri: getProfileImageUrl()! }}
              className="w-28 h-28 rounded-full border-4 border-white"
              style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-blue-100 items-center justify-center border-4 border-white">
              <Ionicons name="person" size={48} color="#3B82F6" />
            </View>
          )}
          <Text className="text-gray-900 text-2xl font-bold mt-4">
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text className="text-gray-600 text-sm mt-1">User ID: {profile?.id?.slice(-8)}</Text>
        </View>

        {/* Details */}
        <View className="px-4 py-5">
          {/* Personal Information */}
          <Text className="text-base font-bold text-gray-900 mb-4">Personal Information</Text>

          <DetailCard
            icon="person-outline"
            label="First Name"
            value={profile?.firstName}
          />

          <DetailCard
            icon="person-outline"
            label="Last Name"
            value={profile?.lastName}
          />

          <DetailCard
            icon="mail-outline"
            label="Email"
            value={profile?.email}
            badge={profile?.isEmailVerified ? 'Verified' : 'Not Verified'}
            badgeColor={profile?.isEmailVerified ? 'green' : 'yellow'}
          />

          <DetailCard
            icon="call-outline"
            label="Mobile Number"
            value={profile?.mobileNumber}
            badge={profile?.isMobileVerified ? 'Verified' : 'Not Verified'}
            badgeColor={profile?.isMobileVerified ? 'green' : 'yellow'}
          />

          <DetailCard
            icon="calendar-outline"
            label="Date of Birth"
            value={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}
          />

          <DetailCard
            icon="briefcase-outline"
            label="Occupation"
            value={profile?.occupation || 'Not set'}
          />

          {/* Address */}
          <Text className="text-base font-bold text-gray-900 mb-4 mt-6">Address</Text>

          <DetailCard
            icon="home-outline"
            label="House & Street"
            value={profile?.address?.houseAndStreet || 'Not set'}
          />

          <DetailCard
            icon="location-outline"
            label="District"
            value={profile?.address?.district || 'Not set'}
          />

          <DetailCard
            icon="location-outline"
            label="State"
            value={profile?.address?.state || 'Not set'}
          />

          <DetailCard
            icon="location-outline"
            label="Country"
            value={profile?.address?.country || 'Not set'}
          />

          <DetailCard
            icon="location-outline"
            label="PIN Code"
            value={profile?.address?.pinCode || 'Not set'}
          />

          {/* Account Information */}
          <Text className="text-base font-bold text-gray-900 mb-4 mt-6">Account Information</Text>

          <DetailCard
            icon="calendar-outline"
            label="Member Since"
            value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
          />

          <DetailCard
            icon="checkmark-circle-outline"
            label="Account Status"
            value={profile?.isActive ? 'Active' : 'Inactive'}
            badge={profile?.isActive ? 'Active' : 'Inactive'}
            badgeColor={profile?.isActive ? 'green' : 'red'}
          />

          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => router.push('/edit-profile' as any)}
            className="bg-blue-600 rounded-xl py-4 mt-6 mb-6 flex-row items-center justify-center"
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Detail Card Component
const DetailCard = ({ icon, label, value, badge, badgeColor }: any) => (
  <View className="bg-gray-50 rounded-xl p-4 mb-3 flex-row items-center">
    <View className="w-10 h-10 rounded-full bg-white items-center justify-center">
      <Ionicons name={icon} size={20} color="#6B7280" />
    </View>

    <View className="flex-1 ml-3">
      <Text className="text-xs text-gray-600 mb-1">{label}</Text>
      <Text className="text-sm font-semibold text-gray-900">{value}</Text>
    </View>

    {badge && (
      <View className={`px-2 py-1 rounded-full ${
        badgeColor === 'green' ? 'bg-green-100' :
        badgeColor === 'yellow' ? 'bg-yellow-100' :
        badgeColor === 'red' ? 'bg-red-100' : 'bg-gray-100'
      }`}>
        <Text className={`text-xs font-semibold ${
          badgeColor === 'green' ? 'text-green-800' :
          badgeColor === 'yellow' ? 'text-yellow-800' :
          badgeColor === 'red' ? 'text-red-800' : 'text-gray-800'
        }`}>
          {badge}
        </Text>
      </View>
    )}
  </View>
);
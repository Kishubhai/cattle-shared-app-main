import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { userAPI, buildImageUrl } from '../../src/api/endpoints/user';
import { authAPI } from '../../src/api/endpoints/auth';
import { clearStorage } from '../../src/utils/storage';
import { getErrorToast } from '../../src/utils/errorHandler';
import { ensureImageQuality } from '../../src/utils/imageQuality';
import Toast from 'react-native-toast-message';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const result = await userAPI.getProfile();
      const userData = result.data || result.user || result;
      setProfile(userData);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'load_data');
      Toast.show({ type: 'error', text1, text2 });
    } finally {
      setLoading(false);
    }
  };

  const getProfileImageUrl = () => buildImageUrl(profile?.profilePicture?.path);

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Gallery Permission Denied',
          'Allow photo library access in your device Settings to change your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const ok = await ensureImageQuality(result.assets[0].uri, handleImagePick);
        if (ok) {
          await uploadProfileImage(result.assets[0].uri);
        }
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Gallery Error', text2: `Could not open gallery. Please try again.  [IMG-003]` });
    }
  };

  const uploadProfileImage = async (uri: string) => {
    try {
      setUploading(true);
      await userAPI.uploadProfileImage(uri);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile picture updated',
      });
      await fetchProfile();
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'upload_image');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            authAPI.logout().catch(() => {});
            await clearStorage();
            // Use state-driven Redirect — guaranteed to work from any nested navigator
            setLoggedOut(true);
          },
        },
      ]
    );
  };

  // Declarative redirect — works reliably from any nested Tab/Stack context
  if (loggedOut) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
        <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: '#F9FAFB' }} edges={['top']}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-3 text-sm">Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#F9FAFB' }}>
          {/* Header with Deep Blue */}
          <View className="px-5 pt-4 pb-24 rounded-b-[28px]" style={{ backgroundColor: '#1E40AF' }}>
            <Text className="text-white text-2xl font-bold">Settings</Text>
            <Text className="text-white/80 text-sm mt-1">Manage your account & preferences</Text>
          </View>

        {/* Profile Card */}
        <View className="px-4 -mt-16 mb-4">
          <View className="bg-white rounded-2xl p-5 shadow-md">
            <View className="items-center">
              <TouchableOpacity
                onPress={handleImagePick}
                disabled={uploading}
                className="relative"
              >
                {getProfileImageUrl() ? (
                  <Image
                    source={{ uri: getProfileImageUrl()! }}
                    className="w-24 h-24 rounded-full border-4 border-blue-100"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center border-4 border-blue-100">
                    <Ionicons name="person" size={40} color="#3B82F6" />
                  </View>
                )}

                {uploading ? (
                  <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2">
                    <ActivityIndicator size="small" color="white" />
                  </View>
                ) : (
                  <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2">
                    <Ionicons name="camera" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>

              <Text className="text-gray-900 text-xl font-bold mt-3">
                {profile?.firstName} {profile?.lastName}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">{profile?.email}</Text>
              <Text className="text-gray-600 text-sm">{profile?.mobileNumber}</Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/edit-profile' as any)}
              className="bg-blue-50 rounded-xl py-3 mt-4 flex-row items-center justify-center"
            >
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
              <Text className="text-blue-600 font-bold text-sm ml-2">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Sections */}
        <View className="px-4">
          {/* Account Settings */}
          <Text className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">
            Account Settings
          </Text>

          <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm">
            <MenuItem
              icon="person-outline"
              title="Personal Information"
              subtitle="View your profile details"
              onPress={() => router.push('/profile-details' as any)}
            />

            <Divider />

            <MenuItem
              icon="lock-closed-outline"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => router.push('/change-password' as any)}
            />

            <Divider />

            <MenuItem
              icon="mail-outline"
              title="Email"
              subtitle={profile?.email}
              badge={profile?.isEmailVerified ? 'Verified' : 'Not Verified'}
              badgeColor={profile?.isEmailVerified ? 'green' : 'yellow'}
            />

            <Divider />

            <MenuItem
              icon="call-outline"
              title="Mobile Number"
              subtitle={profile?.mobileNumber}
              badge={profile?.isMobileVerified ? 'Verified' : 'Not Verified'}
              badgeColor={profile?.isMobileVerified ? 'green' : 'yellow'}
            />
          </View>

          {/* Cattle Management */}
          <Text className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">
            Cattle Management
          </Text>

          {/* <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm">
            <MenuItem
              icon="swap-horizontal-outline"
              title="Transfer Requests"
              subtitle="View pending transfers"
              onPress={() => router.push('/transfer-requests' as any)}
              badge="Coming Soon"
              badgeColor="blue"
            />
          </View> */}

          {/* App Information */}
          <Text className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">
            App Information
          </Text>

          <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm">
            <MenuItem
              icon="information-circle-outline"
              title="Instructions"
              subtitle="How to use this app"
              onPress={() => router.push('/instructions' as any)}
            />

            <Divider />

            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with the app"
              onPress={() => router.push('/help-support' as any)}
            />

            <Divider />

            <MenuItem
              icon="document-text-outline"
              title="Terms & Conditions"
              subtitle="Read our terms"
              onPress={() => router.push('/terms' as any)}
            />

            <Divider />

            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="Read our privacy policy"
              onPress={() => router.push('/privacy-policy' as any)}
            />
          </View>

          {/* Danger Zone */}
          <Text className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">
            Danger Zone
          </Text>

          <View className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
            <MenuItem
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              isDestructive
            />
          </View>

          {/* Version */}
          <Text className="text-center text-gray-500 text-xs mb-6">
            Version 1.0.0
          </Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Menu Item Component
const MenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  badgeColor = 'gray',
  isDestructive = false
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="px-4 py-4 flex-row items-center"
    activeOpacity={0.7}
  >
    <View className={`w-10 h-10 rounded-full items-center justify-center ${
      isDestructive ? 'bg-red-100' : 'bg-gray-100'
    }`}>
      <Ionicons
        name={icon}
        size={20}
        color={isDestructive ? '#EF4444' : '#6B7280'}
      />
    </View>

    <View className="flex-1 ml-3">
      <Text className={`text-sm font-semibold ${
        isDestructive ? 'text-red-600' : 'text-gray-900'
      }`}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>

    {badge && (
      <View className={`px-2 py-1 rounded-full ${
        badgeColor === 'green' ? 'bg-green-100' :
        badgeColor === 'yellow' ? 'bg-yellow-100' :
        badgeColor === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        <Text className={`text-xs font-semibold ${
          badgeColor === 'green' ? 'text-green-800' :
          badgeColor === 'yellow' ? 'text-yellow-800' :
          badgeColor === 'blue' ? 'text-blue-800' : 'text-gray-800'
        }`}>
          {badge}
        </Text>
      </View>
    )}

    {!badge && (
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    )}
  </TouchableOpacity>
);

// Divider Component
const Divider = () => <View className="h-px bg-gray-100 mx-4" />;

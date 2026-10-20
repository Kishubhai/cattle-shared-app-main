import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { getUser, clearToken } from '../../src/utils/storage';
import { authAPI } from '../../src/api/endpoints/auth';
import { userAPI, buildImageUrl } from '../../src/api/endpoints/user';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    cattle: { total: 0 },
    verification: { approved: 0, pending: 0 },
  });

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  const loadUser = async () => {
    const userData = await getUser();
    setUser(userData);
  };

  const loadStats = async () => {
    try {
      const response = await userAPI.getStatistics();
      if (response?.data) setStats(response.data);
    } catch {
      // stats stay at 0 if request fails
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            try {
              await authAPI.logout();
            } catch {
              // continue even if API logout fails
            }
            await clearToken();
            Toast.show({
              type: 'success',
              text1: 'Logged Out',
              text2: 'You have been logged out successfully',
            });
            setTimeout(() => {
              router.replace('/login');
            }, 100);
          } catch {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to logout properly',
            });
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger }: any) => (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-3 flex-row items-center active:bg-gray-50"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View className={`w-12 h-12 rounded-full items-center justify-center ${danger ? 'bg-red-50' : 'bg-blue-50'}`}>
        <Ionicons name={icon} size={24} color={danger ? '#DC2626' : '#3B82F6'} />
      </View>
      <View className="flex-1 ml-4">
        <Text className={`font-semibold ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </Text>
        {subtitle && <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );

  const profileImageUri = buildImageUrl(user?.profilePicture?.path);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          className="px-6 pt-8 pb-12 rounded-b-3xl"
        >
          <View className="items-center">
            <View
              className="w-28 h-28 rounded-full bg-white items-center justify-center mb-4 overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} className="w-full h-full" />
              ) : (
                <Ionicons name="person" size={56} color="#3B82F6" />
              )}
            </View>
            <Text className="text-white text-2xl font-bold mb-1">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-white/80 text-sm">{user?.email}</Text>
            <View className="flex-row items-center mt-2">
              <Ionicons name="call" size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-white/80 text-sm ml-1">{user?.mobileNumber}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View className="px-6 -mt-8 mb-6">
          <View className="bg-white rounded-2xl p-4 flex-row"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-1 items-center border-r border-gray-200">
              <Text className="text-2xl font-bold text-gray-900">{stats.cattle.total}</Text>
              <Text className="text-gray-600 text-sm mt-1">Total Cattle</Text>
            </View>
            <View className="flex-1 items-center border-r border-gray-200">
              <Text className="text-2xl font-bold text-green-600">{stats.verification.approved}</Text>
              <Text className="text-gray-600 text-sm mt-1">Approved</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-yellow-600">{stats.verification.pending}</Text>
              <Text className="text-gray-600 text-sm mt-1">Pending</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Account Settings</Text>

          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => router.push('/edit-profile' as any)}
          />

          <MenuItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push('/change-password' as any)}
          />

          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => {}}
          />

          <Text className="text-lg font-bold text-gray-900 mb-4 mt-6">Support</Text>

          <MenuItem
            icon="information-circle-outline"
            title="About App"
            subtitle="Learn more about Cattle ID"
            onPress={() => {}}
          />

          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with the app"
            onPress={() => {}}
          />

          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Read our terms and privacy policy"
            onPress={() => {}}
          />

          <View className="mt-6 mb-8">
            <MenuItem
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              danger
            />
          </View>

          <Text className="text-center text-gray-400 text-sm mb-8">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

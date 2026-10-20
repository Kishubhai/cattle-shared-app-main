import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { userAPI, buildImageUrl } from '../../src/api/endpoints/user';
import { cattleAPI, buildCattleImageUrl } from '../../src/api/endpoints/cattle';
import Toast from 'react-native-toast-message';
import { getErrorToast } from '../../src/utils/errorHandler';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [recentCattle, setRecentCattle] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [identificationStats, setIdentificationStats] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      const [profileRes, statsRes, cattleRes, identificationRes, notifRes] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getStatistics(),
        apiClient.get('/users/cattle?limit=5'),
        cattleAPI.getIdentificationStatistics().catch(() => null),
        userAPI.getNotifications({ isRead: false, limit: 1 }).catch(() => null),
      ]);

      // Handle profile
      const userData = profileRes.data || profileRes.user || profileRes;
      if (userData) setProfile(userData);

      // Handle statistics
      const statsData = statsRes.data || statsRes.statistics || statsRes;
      if (statsData) setStatistics(statsData);

      // Handle identification stats
      if (identificationRes?.success) {
        setIdentificationStats(identificationRes.data);
      }

      // Handle unread notification count
      if (notifRes?.data) {
        setUnreadCount(notifRes.data.unreadCount ?? 0);
      }

      // Handle cattle
      if (cattleRes?.data) {
        let cattleList: any[] = [];
        let counts = { active: 0, transit: 0, archive: 0 };

        if (cattleRes.data.success && cattleRes.data.data) {
          cattleList = cattleRes.data.data.cattle || [];
          counts = cattleRes.data.data.counts || counts;
        } else if (Array.isArray(cattleRes.data.cattle)) {
          cattleList = cattleRes.data.cattle;
          counts = cattleRes.data.counts || counts;
        }

        setRecentCattle(cattleList.slice(0, 5));

        if (!statistics?.cattle?.byStatus) {
          setStatistics((prev: any) => ({
            ...prev,
            cattle: {
              ...(prev?.cattle || {}),
              byStatus: counts,
            },
            overview: {
              ...(prev?.overview || {}),
              totalCattle: cattleList.length,
            },
          }));
        }
      }
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'load_data');
      Toast.show({ type: 'error', text1, text2 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    if (query.trim().length < 2) return;

    try {
      setSearching(true);
      const response = await apiClient.get(`/users/cattle?search=${query.trim()}`);

      let results: any[] = [];
      if (response?.data?.success && response.data.data) {
        results = response.data.data.cattle || [];
      } else if (Array.isArray(response.data)) {
        results = response.data;
      }

      setSearchResults(results);
    } catch { /* search errors are non-critical */ } finally {
      setSearching(false);
    }
  };

  const getProfileImageUrl = (): string | null => {
    return buildImageUrl(profile?.profilePicture?.path);
  };

  const getCattleThumbnail = (cattle: any): string | null => {
    const filename = cattle.images?.face?.[0]?.filename;
    if (!filename) return null;
    return buildCattleImageUrl('face', filename);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4 text-base">Loading...</Text>
      </SafeAreaView>
    );
  }

  const totalCattle = statistics?.overview?.totalCattle || 0;
  const activeCattle = statistics?.cattle?.byStatus?.active || 0;
  const pendingCattle = statistics?.cattle?.byStatus?.transit || 0;

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <ScrollView
          className="flex-1"
          style={{ backgroundColor: '#F9FAFB' }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDashboardData();
              }}
            />
          }
        >
          {/* Header with Deep Blue */}
          <View className="px-4 pt-2 pb-6 rounded-b-[28px]" style={{ backgroundColor: '#1E40AF' }}>
          {/* Profile Section */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              {getProfileImageUrl() ? (
                <Image
                  source={{ uri: getProfileImageUrl()! }}
                  className="w-14 h-14 rounded-full border-3 border-white/40"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center border-3 border-white/40">
                  <Ionicons name="person" size={28} color="white" />
                </View>
              )}

              <View className="ml-3 flex-1">
                <Text className="text-white/80 text-xs font-medium">Welcome back</Text>
                <Text className="text-white text-lg font-bold mt-0.5" numberOfLines={1}>
                  {profile?.firstName || 'User'} {profile?.lastName || ''}
                </Text>
                {profile?.address?.district && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location" size={12} color="white" />
                    <Text className="text-white/70 text-xs ml-1" numberOfLines={1}>
                      {profile.address.district}, {profile.address.state}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => router.push('/(user)/notifications' as any)}
              className="bg-white/20 rounded-full p-2.5"
              style={{ position: 'relative' }}
            >
              <Ionicons name="notifications" size={22} color="white" />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="bg-white rounded-xl px-4 py-2.5 flex-row items-center mb-4">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search cattle..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              className="flex-1 ml-2 text-gray-900 text-sm"
              style={{ minHeight: 30 }}
            />
            {searching && <ActivityIndicator size="small" color="#3B82F6" />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Cards */}
          <View className="flex-row justify-between">
            <View className="flex-1 mx-1 bg-white/25 rounded-xl p-3.5 shadow-lg" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
              <View className="bg-white/20 rounded-full p-2 self-start mb-2">
                <Ionicons name="apps" size={20} color="white" />
              </View>
              <Text className="text-white text-2xl font-bold">{totalCattle}</Text>
              <Text className="text-white/90 text-xs font-medium mt-0.5">Total Cattle</Text>
            </View>

            <View className="flex-1 mx-1 bg-white/25 rounded-xl p-3.5 shadow-lg" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
              <View className="bg-white/20 rounded-full p-2 self-start mb-2">
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </View>
              <Text className="text-white text-2xl font-bold">{activeCattle}</Text>
              <Text className="text-white/90 text-xs font-medium mt-0.5">Active</Text>
            </View>

            <View className="flex-1 mx-1 bg-white/25 rounded-xl p-3.5 shadow-lg" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
              <View className="bg-white/20 rounded-full p-2 self-start mb-2">
                <Ionicons name="time" size={20} color="white" />
              </View>
              <Text className="text-white text-2xl font-bold">{pendingCattle}</Text>
              <Text className="text-white/90 text-xs font-medium mt-0.5">In Transit</Text>
            </View>
          </View>
        </View>

        {/* Search Results */}
        {searchQuery.trim().length > 0 && (
          <View className="px-4 mt-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Search Results ({searchResults.length})
            </Text>

            {searchResults.length === 0 && !searching && (
              <View className="bg-white rounded-xl p-6 items-center">
                <Ionicons name="search-outline" size={40} color="#9CA3AF" />
                <Text className="text-gray-600 mt-2 text-center text-sm">
                  No cattle found for "{searchQuery}"
                </Text>
              </View>
            )}

            {searchResults.map((cattle) => (
              <CattleCard
                key={cattle._id}
                cattle={cattle}
                getCattleThumbnail={getCattleThumbnail}
              />
            ))}
          </View>
        )}

        {/* Content - Only show if not searching */}
        {searchQuery.trim().length === 0 && (
          <>
            {/* Quick Actions */}
            <View className="px-4 mt-5">
              <Text className="text-base font-bold text-gray-900 mb-3">Quick Actions</Text>

              <View className="flex-row flex-wrap justify-between">
                <ActionCard
                  icon="add-circle"
                  label="Register"
                  subtitle="Add New Cattle"
                  color="#10B981"
                  onPress={() => router.push('/(user)/add')}
                />
                <ActionCard
                  icon="images"
                  label="Gallery"
                  subtitle="View All"
                  color="#8B5CF6"
                  onPress={() => router.push('/(user)/gallery')}
                />
                <ActionCard
                  icon="scan"
                  label="Identify"
                  subtitle="New Request"
                  color="#9333EA"
                  onPress={() => router.push('/(user)/identify')}
                />
                <ActionCard
                  icon="document-text"
                  label="Requests"
                  subtitle="View Status"
                  color="#F59E0B"
                  badge={identificationStats?.pending || 0}
                  onPress={() => router.push('/(user)/identification-status')}
                />
              </View>
            </View>

            {/* Identification Status Summary */}
            {identificationStats && (identificationStats.pending > 0 || identificationStats.completed > 0) && (
              <View className="px-4 mt-5">
                <TouchableOpacity
                  onPress={() => router.push('/(user)/identification-status')}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-4 shadow-lg"
                  style={{ backgroundColor: '#9333EA' }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white text-lg font-bold mb-1">Cattle Identification</Text>
                      <Text className="text-white/80 text-sm mb-3">Track your identification requests</Text>

                      <View className="flex-row">
                        {identificationStats.pending > 0 && (
                          <View className="bg-white/20 rounded-lg px-3 py-1.5 mr-2">
                            <Text className="text-white text-xs">⏳ {identificationStats.pending} Pending</Text>
                          </View>
                        )}
                        {identificationStats.completed > 0 && (
                          <View className="bg-white/20 rounded-lg px-3 py-1.5 mr-2">
                            <Text className="text-white text-xs">✅ {identificationStats.completed} Done</Text>
                          </View>
                        )}
                        {identificationStats.failed > 0 && (
                          <View className="bg-white/20 rounded-lg px-3 py-1.5">
                            <Text className="text-white text-xs">❌ {identificationStats.failed} Failed</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="bg-white/20 rounded-full p-3">
                      <Ionicons name="chevron-forward" size={24} color="white" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Cattle */}
            {recentCattle.length > 0 && (
              <View className="px-4 mt-5 mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-lg font-bold text-gray-900">Recent Cattle</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Your latest registered animals</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(user)/gallery')}
                    className="bg-blue-600 rounded-full px-4 py-2"
                  >
                    <Text className="text-white font-semibold text-xs">View All →</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                  {recentCattle.map((cattle, index) => (
                    <RecentCard
                      key={cattle._id}
                      cattle={cattle}
                      getCattleThumbnail={getCattleThumbnail}
                      isFirst={index === 0}
                      isLast={index === recentCattle.length - 1}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Action Card - Responsive with Subtitle and Badge
const ActionCard = ({ icon, label, subtitle, color, onPress, badge }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="rounded-xl mb-3 overflow-hidden shadow-sm"
    style={{
      width: (width - 48) / 2 - 6,
      backgroundColor: color,
    }}
  >
    <View className="px-3 py-4 items-center relative">
      {badge !== undefined && badge > 0 && (
        <View className="absolute top-1 right-1 bg-red-500 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
          <Text className="text-white text-xs font-bold">{badge}</Text>
        </View>
      )}
      <Ionicons name={icon} size={28} color="white" />
      <Text className="text-white text-sm font-bold mt-1.5">{label}</Text>
      {subtitle && (
        <Text className="text-white/80 text-xs mt-0.5">{subtitle}</Text>
      )}
    </View>
  </TouchableOpacity>
);

// Cattle Card for Search
const CattleCard = ({ cattle, getCattleThumbnail }: any) => (
  <TouchableOpacity
    onPress={() => router.push(`/(user)/cattle/${cattle._id}`)}
    className="bg-white rounded-xl p-3 mb-3 flex-row items-center shadow-sm"
  >
    {getCattleThumbnail(cattle) ? (
      <Image
        source={{ uri: getCattleThumbnail(cattle)! }}
        className="w-14 h-14 rounded-lg"
        resizeMode="cover"
      />
    ) : (
      <View className="w-14 h-14 rounded-lg bg-gray-200 items-center justify-center">
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
      </View>
    )}

    <View className="flex-1 ml-3">
      <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
        {cattle.cattleId || 'N/A'}
      </Text>
      <Text className="text-gray-600 text-xs mt-0.5" numberOfLines={1}>
        {cattle.breed}
      </Text>
      <View className={`mt-1 px-2 py-0.5 rounded-full self-start ${
        cattle.status === 'active' ? 'bg-green-100' :
        cattle.status === 'transit' ? 'bg-yellow-100' : 'bg-gray-100'
      }`}>
        <Text className={`text-xs font-semibold ${
          cattle.status === 'active' ? 'text-green-800' :
          cattle.status === 'transit' ? 'text-yellow-800' : 'text-gray-800'
        }`}>
          {cattle.status}
        </Text>
      </View>
    </View>

    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

// Recent Cattle Card
const RecentCard = ({ cattle, getCattleThumbnail, isFirst, isLast }: any) => {
  const cardWidth = (width - 48) / 2.2;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(user)/cattle/${cattle._id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-lg mr-3"
      style={{
        width: cardWidth,
        marginLeft: isFirst ? 0 : 0,
        marginRight: isLast ? 0 : 12,
      }}
    >
      {/* Image Container */}
      <View className="relative">
        {getCattleThumbnail(cattle) ? (
          <Image
            source={{ uri: getCattleThumbnail(cattle)! }}
            className="w-full bg-gray-100"
            style={{ height: cardWidth * 0.85 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full items-center justify-center"
            style={{ height: cardWidth * 0.85, backgroundColor: '#E5E7EB' }}
          >
            <Ionicons name="image-outline" size={36} color="#9CA3AF" />
          </View>
        )}

        {/* Status Badge Overlay */}
        <View className="absolute top-2 right-2">
          <View className={`px-2.5 py-1 rounded-full ${
            cattle.status === 'active' ? 'bg-green-500' :
            cattle.status === 'transit' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}>
            <Text className="text-white text-xs font-bold">
              {cattle.status === 'active' ? '✓' : cattle.status === 'transit' ? '⏳' : '•'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View className="p-3">
        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
          {cattle.cattleId || 'N/A'}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="paw" size={12} color="#6B7280" />
          <Text className="text-gray-600 text-xs ml-1 flex-1" numberOfLines={1}>
            {cattle.breed}
          </Text>
        </View>

        <View className="flex-row items-center mt-1.5 justify-between">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">
              {new Date(cattle.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { cattleAPI, buildCattleImageUrl } from '../../src/api/endpoints/cattle';

type CattleStatus = 'all' | 'active' | 'transit' | 'archive';

interface Cattle {
  _id: string;
  cattleId: string;
  breed: string;
  age: number;
  tagNo?: string;
  status: 'active' | 'transit' | 'archive';
  verification: { status: string };
  images: {
    muzzle: Array<{ filename: string; path: string }>;
    face: Array<{ filename: string; path: string }>;
  };
  createdAt: string;
}

export default function GalleryScreen() {
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [filteredCattle, setFilteredCattle] = useState<Cattle[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<CattleStatus>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ active: 0, transit: 0, archive: 0 });

  const fetchCattle = async () => {
    try {
      const response = await cattleAPI.getMyCattle();
      const cattleData: Cattle[] = response?.data?.cattle ?? [];
      const countsData = response?.data?.counts ?? { active: 0, transit: 0, archive: 0 };
      setCattle(cattleData);
      setCounts(countsData);
      filterCattle(cattleData, selectedStatus);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error Loading Gallery',
        text2: error.response?.data?.message || 'Failed to load cattle',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCattle = (data: Cattle[], status: CattleStatus) => {
    if (status === 'all') { setFilteredCattle(data); return; }

    const filtered = data.filter((item) => {
      if (!item) return false;
      if (status === 'active') return item.status === 'active' && item.verification?.status === 'approved';
      if (status === 'archive') return item.status === 'archive';
      if (status === 'transit') {
        return (
          item.status === 'transit' ||
          item.verification?.status === 'pending_regional_review' ||
          item.verification?.status === 'forwarded_to_m_admin' ||
          item.verification?.status === 'pending_m_admin_review'
        );
      }
      return false;
    });
    setFilteredCattle(filtered);
  };

  const handleStatusChange = (status: CattleStatus) => {
    setSelectedStatus(status);
    filterCattle(cattle, status);
  };

  const onRefresh = () => { setRefreshing(true); fetchCattle(); };

  const getStatusBadgeColor = (item: Cattle) => {
    if (item.status === 'active') return 'bg-green-500';
    if (item.status === 'archive') return 'bg-gray-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (item: Cattle) => {
    if (item.status === 'active') return 'Active';
    if (item.status === 'archive') return 'Archived';
    if (item.verification?.status === 'pending_regional_review') return 'Pending Review';
    if (item.verification?.status === 'forwarded_to_m_admin') return 'Under Review';
    if (item.verification?.status === 'pending_m_admin_review') return 'Identifying';
    return 'Transit';
  };

  const getThumbnailUri = (item: Cattle): string | null => {
    if (item.images?.face?.[0]?.filename)
      return buildCattleImageUrl('face', item.images.face[0].filename);
    if (item.images?.muzzle?.[0]?.filename)
      return buildCattleImageUrl('muzzle', item.images.muzzle[0].filename);
    return null;
  };

  useEffect(() => {
    fetchCattle();
  }, []);

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
        <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: '#F9FAFB' }} edges={['top']}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4 text-base">Loading your cattle...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <View className="flex-1" style={{ backgroundColor: '#F9FAFB' }}>
          {/* Header */}
          <View className="px-5 pt-4 pb-5 rounded-b-3xl" style={{ backgroundColor: '#1E40AF' }}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-white">My Cattle Gallery</Text>
                <Text className="text-white/80 mt-1 text-sm">
                  {filteredCattle.length} {filteredCattle.length === 1 ? 'animal' : 'animals'} • {cattle.length} total
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => router.push('/(user)/identification-status')}
                  className="bg-purple-500/90 rounded-full p-3 shadow-lg mr-2"
                >
                  <Ionicons name="scan" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(user)/add')}
                  className="bg-white/20 rounded-full p-3 shadow-lg"
                >
                  <Ionicons name="add" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Filter Tabs — horizontal scroll so Archive is fully reachable */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingRight: 8,
                alignItems: 'center',
                flexGrow: 1,
              }}
            >
              {(['all', 'active', 'transit', 'archive'] as CattleStatus[]).map((status) => {
                const count = status === 'all' ? cattle.length : counts[status] || 0;
                const isSelected = selectedStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusChange(status)}
                    style={[
                      {
                        marginRight: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: isSelected ? 'white' : 'rgba(255,255,255,0.2)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexShrink: 0,
                      },
                      isSelected ? { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' } : {},
                    ]}
                  >
                    <Text style={{ fontWeight: 'bold', textTransform: 'capitalize', fontSize: 13, color: isSelected ? '#2563EB' : 'white' }}>
                      {status}
                    </Text>
                    <View style={{
                      marginLeft: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: isSelected ? '#DBEAFE' : 'rgba(255,255,255,0.3)',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: isSelected ? '#2563EB' : 'white' }}>
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Cattle Grid */}
          <ScrollView
            className="flex-1 px-5 pt-5"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {filteredCattle.length === 0 ? (
              <View className="items-center justify-center py-24">
                <View className="bg-gray-100 rounded-full p-6 mb-4">
                  <Ionicons name="folder-open-outline" size={64} color="#9CA3AF" />
                </View>
                <Text className="text-gray-700 text-xl font-bold text-center">
                  {selectedStatus === 'all' ? 'No Cattle Yet' : `No ${selectedStatus} cattle`}
                </Text>
                <Text className="text-gray-500 text-sm mt-3 text-center px-8 leading-5">
                  {selectedStatus === 'all'
                    ? 'Start building your cattle database by registering your first animal'
                    : 'Switch to "All" to see all your registered cattle'}
                </Text>
                {selectedStatus === 'all' && (
                  <TouchableOpacity
                    onPress={() => router.push('/(user)/add')}
                    className="bg-blue-600 rounded-full px-6 py-3 mt-6 shadow-lg"
                  >
                    <Text className="text-white font-bold">Register First Cattle</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between pb-6">
                {filteredCattle.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => router.push(`/(user)/cattle/${item._id}`)}
                    className="w-[48%] bg-white rounded-2xl overflow-hidden mb-4 shadow-lg"
                  >
                    <View className="relative">
                      {getThumbnailUri(item) ? (
                        <Image
                          source={{ uri: getThumbnailUri(item)! }}
                          className="w-full h-40 bg-gray-100"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-40 items-center justify-center" style={{ backgroundColor: '#E5E7EB' }}>
                          <Ionicons name="image-outline" size={44} color="#9CA3AF" />
                        </View>
                      )}
                      <View className={`absolute top-2 right-2 ${getStatusBadgeColor(item)} px-3 py-1.5 rounded-full shadow-md flex-row items-center`}>
                        <Text className="text-white text-xs font-bold">
                          {item.status === 'active' ? '✓' : item.status === 'transit' ? '⏳' : '📦'}
                        </Text>
                      </View>
                      <View className="absolute bottom-0 left-0 right-0 h-12" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
                      <View className="absolute bottom-2 left-2 right-2">
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                          {item.cattleId || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View className="p-3">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="paw" size={14} color="#3B82F6" />
                        <Text className="text-gray-700 text-sm ml-1.5 flex-1 font-medium" numberOfLines={1}>
                          {item.breed}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                          <Text className="text-gray-500 text-xs ml-1">{item.age} yrs</Text>
                        </View>
                        {item.tagNo && (
                          <View className="flex-row items-center">
                            <Ionicons name="pricetag" size={12} color="#9CA3AF" />
                            <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>{item.tagNo}</Text>
                          </View>
                        )}
                      </View>
                      <View className="mt-2 pt-2 border-t border-gray-100">
                        <Text className={`text-xs font-semibold ${
                          item.status === 'active' ? 'text-green-600' :
                          item.status === 'transit' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {getStatusText(item)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { superAdminAPI } from '../../src/api/endpoints/admin';
import Toast from 'react-native-toast-message';

export default function CattleScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cattle, setCattle] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchCattle();
  }, [filterStatus]);

  const fetchCattle = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const response = await superAdminAPI.getAllCattle({
        page: 1,
        limit: 100,
        status: filterStatus,
        search: searchQuery,
      });

      setCattle(response.data.cattle || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load cattle',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCattle(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#ECFDF5', text: '#10B981' };
      case 'transit':
        return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'archived':
        return { bg: '#F3F4F6', text: '#6B7280' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const filteredCattle = cattle.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.cattleId?.toLowerCase().includes(searchLower) ||
      c.breed?.toLowerCase().includes(searchLower) ||
      c.tagNo?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading Cattle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cattle Management</Text>
        <Text style={styles.subtitle}>{filteredCattle.length} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, breed, or tag..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === undefined && styles.filterButtonActive]}
          onPress={() => setFilterStatus(undefined)}
        >
          <Text style={[styles.filterText, filterStatus === undefined && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'active' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('active')}
        >
          <Text style={[styles.filterText, filterStatus === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'transit' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('transit')}
        >
          <Text style={[styles.filterText, filterStatus === 'transit' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'archived' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('archived')}
        >
          <Text style={[styles.filterText, filterStatus === 'archived' && styles.filterTextActive]}>
            Archived
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredCattle.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No cattle found</Text>
          </View>
        ) : (
          filteredCattle.map((c) => {
            const statusColors = getStatusColor(c.status);
            return (
              <TouchableOpacity
                key={c._id}
                style={styles.card}
                onPress={() => {
                  router.push({
                    pathname: '/(super-admin)/cattle-detail',
                    params: { id: c._id }
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarContainer}>
                    <Ionicons name="paw" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{c.cattleId}</Text>
                    <Text style={styles.cardBreed}>{c.breed || 'Unknown breed'}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.badgeText, { color: statusColors.text }]}>
                      {c.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="barcode-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Tag: {c.tagNo || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>Age: {c.age || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      Owner: {c.owner?.firstName} {c.owner?.lastName}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {c.location?.district}, {c.location?.state}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(super-admin)/add-cattle')}
      >
        <Ionicons name="paw" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  filters: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterButtonActive: { backgroundColor: '#F59E0B' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: 'white' },
  list: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardBreed: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardDetails: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { marginLeft: 8, fontSize: 14, color: '#374151' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

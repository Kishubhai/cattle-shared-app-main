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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { superAdminAPI } from '../../src/api/endpoints/admin';
import Toast from 'react-native-toast-message';

export default function RegionalAdminsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    fetchAdmins();
  }, [filterActive]);

  const fetchAdmins = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const response = await superAdminAPI.getAllRegionalAdmins({
        isActive: filterActive,
        page: 1,
        limit: 100,
      });

      setAdmins(response.data.admins || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load regional admins',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins(true);
  };

  const handleDeactivate = (id: string, name: string) => {
    Alert.alert(
      'Deactivate Admin',
      `Are you sure you want to deactivate ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await superAdminAPI.deactivateRegionalAdmin(id);
              Toast.show({
                type: 'success',
                text1: 'Deactivated',
                text2: `${name} has been deactivated`,
              });
              fetchAdmins();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Failed to deactivate',
              });
            }
          },
        },
      ]
    );
  };

  const handleActivate = (id: string, name: string) => {
    Alert.alert(
      'Activate Admin',
      `Are you sure you want to activate ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await superAdminAPI.activateRegionalAdmin(id);
              Toast.show({
                type: 'success',
                text1: 'Activated',
                text2: `${name} has been activated`,
              });
              fetchAdmins();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Failed to activate',
              });
            }
          },
        },
      ]
    );
  };

  const filteredAdmins = admins.filter((admin) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      admin.firstName?.toLowerCase().includes(searchLower) ||
      admin.lastName?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.assignedRegion?.state?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading Regional Admins...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Regional Admins</Text>
        <Text style={styles.subtitle}>{filteredAdmins.length} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or region..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filterActive === undefined && styles.filterButtonActive]}
          onPress={() => setFilterActive(undefined)}
        >
          <Text style={[styles.filterText, filterActive === undefined && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterActive === true && styles.filterButtonActive]}
          onPress={() => setFilterActive(true)}
        >
          <Text style={[styles.filterText, filterActive === true && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterActive === false && styles.filterButtonActive]}
          onPress={() => setFilterActive(false)}
        >
          <Text style={[styles.filterText, filterActive === false && styles.filterTextActive]}>
            Inactive
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredAdmins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No regional admins found</Text>
          </View>
        ) : (
          filteredAdmins.map((admin) => (
            <View key={admin._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="shield-checkmark" size={24} color="#6366F1" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {admin.firstName} {admin.lastName}
                  </Text>
                  <Text style={styles.cardEmail}>{admin.email}</Text>
                </View>
                <View style={[styles.badge, admin.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, admin.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{admin.mobileNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{admin.assignedRegion?.state || 'No region'}</Text>
                </View>
              </View>

              {admin.isActive ? (
                <TouchableOpacity
                  style={styles.deactivateButton}
                  onPress={() => handleDeactivate(admin._id, `${admin.firstName} ${admin.lastName}`)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.deactivateText}>Deactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={() => handleActivate(admin._id, `${admin.firstName} ${admin.lastName}`)}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                  <Text style={styles.activateText}>Activate</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(super-admin)/add-regional-admin')}
      >
        <Ionicons name="add" size={28} color="white" />
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
  filterButtonActive: { backgroundColor: '#6366F1' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: 'white' },
  list: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#ECFDF5' },
  badgeInactive: { backgroundColor: '#FEF2F2' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextActive: { color: '#10B981' },
  badgeTextInactive: { color: '#EF4444' },
  cardDetails: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { marginLeft: 8, fontSize: 14, color: '#374151' },
  deactivateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  deactivateText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#EF4444' },
  activateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' },
  activateText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#10B981' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
});

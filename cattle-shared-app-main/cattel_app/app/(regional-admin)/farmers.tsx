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
import { regionalAdminAPI } from '../../src/api/endpoints/admin';
import Toast from 'react-native-toast-message';

export default function FarmersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchByPhone, setSearchByPhone] = useState('');

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const response = await regionalAdminAPI.getAllFarmers({
        page: 1,
        limit: 100,
        search: searchQuery,
      });

      setFarmers(response.data.users || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load farmers',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchByPhone = async () => {
    if (!searchByPhone || searchByPhone.length !== 10) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone',
        text2: 'Please enter a valid 10-digit phone number',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await regionalAdminAPI.searchFarmerByPhone(searchByPhone);
      setFarmers([response.data]);
      Toast.show({
        type: 'success',
        text1: 'Found',
        text2: 'Farmer found successfully',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Not Found',
        text2: error.response?.data?.message || 'Farmer not found',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFarmers(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading Farmers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Farmers</Text>
        <Text style={styles.subtitle}>{farmers.length} total</Text>
      </View>

      {/* Search by Phone */}
      <View style={styles.phoneSearchContainer}>
        <View style={styles.phoneInputContainer}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.phoneInput}
            placeholder="Search by phone number..."
            value={searchByPhone}
            onChangeText={setSearchByPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearchByPhone}>
          <Ionicons name="search" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search by Name */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchFarmers()}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {farmers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No farmers found</Text>
          </View>
        ) : (
          farmers.map((farmer) => (
            <TouchableOpacity
              key={farmer._id}
              style={styles.card}
              onPress={() => {
                router.push({
                  pathname: '/(regional-admin)/farmer-detail',
                  params: { id: farmer._id }
                });
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={24} color="#10B981" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {farmer.firstName} {farmer.lastName}
                  </Text>
                  <Text style={styles.cardEmail}>{farmer.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{farmer.mobileNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {farmer.address?.district}, {farmer.address?.state}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="paw-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{farmer.cattle?.length || 0} cattle registered</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(regional-admin)/add-farmer')}
      >
        <Ionicons name="person-add" size={24} color="white" />
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
  phoneSearchContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, gap: 8 },
  phoneInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  phoneInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  searchButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 20, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  list: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
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
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

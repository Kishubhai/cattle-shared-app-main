import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { regionalAdminAPI } from '../../src/api/endpoints/admin';

export default function FarmerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [farmer, setFarmer] = useState<any>(null);

  useEffect(() => {
    if (farmerId) {
      fetchFarmerDetails();
    }
  }, [farmerId]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Farmer',
      `Are you sure you want to delete ${farmer?.firstName} ${farmer?.lastName}? This will also delete all their cattle records. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await regionalAdminAPI.deleteFarmer(farmerId);
              Toast.show({ type: 'success', text1: 'Farmer deleted successfully' });
              router.back();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Failed to delete farmer' });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const fetchFarmerDetails = async () => {
    try {
      setLoading(true);
      const response = await regionalAdminAPI.getFarmerById(farmerId);
      setFarmer(response.data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load farmer details',
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading Farmer Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!farmer) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Farmer Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={deleting}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color="#10B981" />
          </View>
          <Text style={styles.name}>
            {farmer.firstName} {farmer.lastName}
          </Text>
          <Text style={styles.email}>{farmer.email}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{farmer.mobileNumber}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{farmer.email}</Text>
            </View>
          </View>

          {farmer.dateOfBirth && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {new Date(farmer.dateOfBirth).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {farmer.occupation && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="briefcase-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Occupation</Text>
                <Text style={styles.infoValue}>{farmer.occupation}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>

          {farmer.address?.houseAndStreet && (
            <View style={styles.addressLine}>
              <Text style={styles.addressText}>{farmer.address.houseAndStreet}</Text>
            </View>
          )}

          {farmer.address?.village && (
            <View style={styles.addressLine}>
              <Text style={styles.addressText}>{farmer.address.village}</Text>
            </View>
          )}

          <View style={styles.addressLine}>
            <Text style={styles.addressText}>
              {farmer.address?.district}, {farmer.address?.state} - {farmer.address?.pinCode}
            </Text>
          </View>
        </View>

        {/* Cattle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cattle Registered</Text>

          <View style={styles.statCard}>
            <Ionicons name="paw" size={32} color="#10B981" />
            <Text style={styles.statValue}>{farmer.cattle?.length || 0}</Text>
            <Text style={styles.statLabel}>Total Cattle</Text>
          </View>
        </View>

        {/* Account Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Email Verified</Text>
            <View style={[styles.statusBadge, farmer.isEmailVerified && styles.statusBadgeActive]}>
              <Text style={[styles.statusText, farmer.isEmailVerified && styles.statusTextActive]}>
                {farmer.isEmailVerified ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Mobile Verified</Text>
            <View style={[styles.statusBadge, farmer.isMobileVerified && styles.statusBadgeActive]}>
              <Text style={[styles.statusText, farmer.isMobileVerified && styles.statusTextActive]}>
                {farmer.isMobileVerified ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Joined On</Text>
            <Text style={styles.statusValue}>
              {new Date(farmer.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  deleteButton: { padding: 4, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1 },
  profileCard: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280' },
  section: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  addressLine: { marginBottom: 8 },
  addressText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  statCard: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#ECFDF5', borderRadius: 12 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#10B981', marginTop: 8 },
  statLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statusLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FEF2F2' },
  statusBadgeActive: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  statusTextActive: { color: '#10B981' },
  statusValue: { fontSize: 14, color: '#6B7280' },
});

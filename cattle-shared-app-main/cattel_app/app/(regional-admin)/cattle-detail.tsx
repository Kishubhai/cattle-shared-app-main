import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { regionalAdminAPI } from '../../src/api/endpoints/admin';

export default function CattleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cattleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [cattle, setCattle] = useState<any>(null);

  useEffect(() => {
    if (cattleId) {
      fetchCattleDetails();
    }
  }, [cattleId]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Cattle',
      `Are you sure you want to delete cattle ${cattle?.cattleId}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await regionalAdminAPI.deleteCattle(cattleId);
              Toast.show({ type: 'success', text1: 'Cattle deleted successfully' });
              router.back();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Failed to delete cattle' });
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const fetchCattleDetails = async () => {
    try {
      setLoading(true);
      const response = await regionalAdminAPI.getCattleById(cattleId);
      setCattle(response.data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load cattle details',
      });
      router.back();
    } finally {
      setLoading(false);
    }
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

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#ECFDF5', text: '#10B981' };
      case 'pending_verification':
        return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'rejected':
        return { bg: '#FEF2F2', text: '#EF4444' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading Cattle Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cattle) {
    return null;
  }

  const statusColors = getStatusColor(cattle.status);
  const verificationColors = getVerificationStatusColor(cattle.verification?.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Cattle Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={deleting}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cattle ID Card */}
        <View style={styles.idCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="paw" size={48} color="#F59E0B" />
          </View>
          <Text style={styles.cattleId}>{cattle.cattleId}</Text>
          <Text style={styles.breed}>{cattle.breed || 'Unknown breed'}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {cattle.status}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: verificationColors.bg }]}>
              <Text style={[styles.statusText, { color: verificationColors.text }]}>
                {cattle.verification?.status?.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="barcode-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tag Number</Text>
              <Text style={styles.infoValue}>{cattle.tagNo || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{cattle.age || 'N/A'}</Text>
            </View>
          </View>

          {cattle.type && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="pricetag-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>{cattle.type}</Text>
              </View>
            </View>
          )}

          {cattle.color && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="color-palette-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Color</Text>
                <Text style={styles.infoValue}>{cattle.color}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Owner Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Owner Name</Text>
              <Text style={styles.infoValue}>
                {cattle.owner?.firstName} {cattle.owner?.lastName}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{cattle.owner?.mobileNumber || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {cattle.location?.district}, {cattle.location?.state} - {cattle.location?.pinCode}
              </Text>
            </View>
          </View>
        </View>

        {/* Medical History */}
        {cattle.medicalHistory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical History</Text>
            <Text style={styles.medicalText}>{cattle.medicalHistory}</Text>
          </View>
        )}

        {/* Images */}
        {cattle.images && Object.keys(cattle.images).some(key => cattle.images[key]?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>

            {cattle.images.face && cattle.images.face.length > 0 && (
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Face</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imageRow}>
                    {cattle.images.face.map((img: any, index: number) => (
                      <View key={index} style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>Face {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {cattle.images.left && cattle.images.left.length > 0 && (
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Left Side</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imageRow}>
                    {cattle.images.left.map((img: any, index: number) => (
                      <View key={index} style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>Left {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {cattle.images.right && cattle.images.right.length > 0 && (
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Right Side</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imageRow}>
                    {cattle.images.right.map((img: any, index: number) => (
                      <View key={index} style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                        <Text style={styles.imagePlaceholderText}>Right {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Registration Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Registered On</Text>
              <Text style={styles.infoValue}>
                {new Date(cattle.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {cattle.verification?.submittedAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Submitted For Verification</Text>
                <Text style={styles.infoValue}>
                  {new Date(cattle.verification.submittedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {cattle.verification?.verifiedAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Verified On</Text>
                <Text style={styles.infoValue}>
                  {new Date(cattle.verification.verifiedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
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
  deleteButton: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1 },
  idCard: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cattleId: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  breed: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  section: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  medicalText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  imageSection: { marginBottom: 16 },
  imageLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  imageRow: { flexDirection: 'row', gap: 12 },
  imagePlaceholder: { width: 120, height: 120, backgroundColor: '#F3F4F6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  imagePlaceholderText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});

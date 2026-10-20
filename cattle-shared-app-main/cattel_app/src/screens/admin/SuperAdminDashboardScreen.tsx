import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { superAdminAPI } from '../../api/endpoints/admin';
import Toast from 'react-native-toast-message';
import { getErrorToast } from '../../utils/errorHandler';

export default function SuperAdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const response = await superAdminAPI.getDashboardStats();
      setStats(response.data);
      try {
        const notifResponse = await superAdminAPI.getNotifications({ isRead: false, limit: 1 });
        setUnreadCount(notifResponse.data?.pagination?.total ?? 0);
      } catch { /* notifications are non-critical */ }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        ...getErrorToast(error, 'load_data'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Super Admin</Text>
            <Text style={styles.subtitle}>System-wide Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(super-admin)/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="people"
              iconColor="#3B82F6"
              title="Total Farmers"
              value={stats?.overview?.totalUsers || 0}
              bgColor="#EFF6FF"
            />
            <StatCard
              icon="paw"
              iconColor="#10B981"
              title="Total Cattle"
              value={stats?.overview?.totalCattle || 0}
              bgColor="#ECFDF5"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="shield-checkmark"
              iconColor="#8B5CF6"
              title="Regional Admins"
              value={stats?.admins?.regional || 0}
              bgColor="#F5F3FF"
            />
            <StatCard
              icon="alert-circle"
              iconColor="#EF4444"
              title="Pending Review"
              value={stats?.overview?.overdueVerifications || 0}
              bgColor="#FEF2F2"
            />
          </View>
        </View>

        {/* Cattle Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cattle Status</Text>
          <View style={styles.card}>
            <StatusRow
              label="Active"
              value={stats?.cattle?.byStatus?.active || 0}
              color="#10B981"
            />
            <StatusRow
              label="Pending Verification"
              value={stats?.cattle?.byStatus?.transit || 0}
              color="#F59E0B"
            />
            <StatusRow
              label="Archived"
              value={stats?.cattle?.byStatus?.archived || 0}
              color="#6B7280"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionCard
              icon="person-add"
              iconColor="#3B82F6"
              bgColor="#EFF6FF"
              title="Add Farmer"
              onPress={() => router.push('/(super-admin)/add-farmer')}
            />
            <QuickActionCard
              icon="paw"
              iconColor="#10B981"
              bgColor="#ECFDF5"
              title="Add Cattle"
              onPress={() => router.push('/(super-admin)/add-cattle')}
            />
            <QuickActionCard
              icon="shield-checkmark"
              iconColor="#8B5CF6"
              bgColor="#F5F3FF"
              title="Regional Admins"
              onPress={() => router.push('/(super-admin)/regional-admins')}
            />
            <QuickActionCard
              icon="people"
              iconColor="#F59E0B"
              bgColor="#FEF3C7"
              title="Manage Farmers"
              onPress={() => router.push('/(super-admin)/farmers')}
            />
            <QuickActionCard
              icon="paw"
              iconColor="#EC4899"
              bgColor="#FCE7F3"
              title="Manage Cattle"
              onPress={() => router.push('/(super-admin)/cattle')}
            />
            <QuickActionCard
              icon="settings"
              iconColor="#6366F1"
              bgColor="#EEF2FF"
              title="Settings"
              onPress={() => router.push('/(super-admin)/profile')}
            />
          </View>
        </View>

        {/* Top Regions */}
        {stats?.breakdown?.byDistrict && stats.breakdown.byDistrict.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Regions</Text>
            <View style={styles.card}>
              {stats.breakdown.byDistrict.slice(0, 5).map((district: any, index: number) => (
                <View key={index} style={styles.regionRow}>
                  <View style={styles.regionInfo}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.regionName}>{district._id || 'Unknown'}</Text>
                  </View>
                  <Text style={styles.regionCount}>{district.totalCattle} cattle</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, iconColor, title, value, bgColor }: any) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View style={styles.statIconContainer}>
      <Ionicons name={icon} size={24} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const StatusRow = ({ label, value, color }: any) => (
  <View style={styles.statusRow}>
    <View style={styles.statusLabel}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
    <Text style={styles.statusValue}>{value.toLocaleString()}</Text>
  </View>
);

const QuickActionCard = ({ icon, iconColor, bgColor, title, onPress }: any) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={28} color={iconColor} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '31.5%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  regionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionName: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  regionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
});

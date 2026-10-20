import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { superAdminAPI } from '../../src/api/endpoints/admin';

const getNotificationStyle = (type: string) => {
  const positive = ['cattle_approved', 'identification_found', 'account_activated', 'account_created', 'admin_approved', 'transfer_request_accepted'];
  const negative = ['cattle_rejected', 'identification_failed', 'account_deactivated', 'admin_rejected', 'transfer_request_rejected'];
  const warning = ['verification_overdue', 'ml_identification_failed', 'ml_registration_failed', 'verification_reminder', 'transfer_request_received'];

  if (positive.includes(type)) return { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
  if (negative.includes(type)) return { icon: 'close-circle', color: '#EF4444', bg: '#FEF2F2' };
  if (warning.includes(type)) return { icon: 'warning', color: '#F59E0B', bg: '#FEF3C7' };
  return { icon: 'notifications', color: '#6366F1', bg: '#EEF2FF' };
};

const getRelativeTime = (dateString: string) => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function SuperAdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      if (!refreshing) setLoading(true);
      const result = await superAdminAPI.getNotifications({ page: 1, limit: 50 });
      const data = result.data;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load notifications' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await superAdminAPI.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      Toast.show({ type: 'success', text1: 'All marked as read' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to mark notifications as read' });
    }
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await superAdminAPI.markNotificationRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch { /* non-critical */ }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNotifications(); }}
            colors={['#6366F1']}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>System activity will appear here</Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const style = getNotificationStyle(notification.type);
            return (
              <TouchableOpacity
                key={notification._id}
                style={[styles.card, !notification.isRead && styles.cardUnread]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: style.bg }]}>
                  <Ionicons name={style.icon as any} size={22} color={style.color} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardTitle, !notification.isRead && styles.cardTitleUnread]} numberOfLines={2}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.cardTime}>{getRelativeTime(notification.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  markAllBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markAllText: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardUnread: { backgroundColor: '#F5F3FF', borderLeftColor: '#6366F1' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151', lineHeight: 20, marginRight: 6 },
  cardTitleUnread: { fontWeight: '700', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginTop: 4, flexShrink: 0 },
  cardMessage: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});

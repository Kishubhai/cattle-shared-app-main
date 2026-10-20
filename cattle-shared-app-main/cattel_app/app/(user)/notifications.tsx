import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { userAPI } from '../../src/api/endpoints/user';

// ── Helpers ─────────────────────────────────────────────────────────────────

const getNotificationStyle = (type: string) => {
  const positive = [
    'cattle_approved', 'identification_found', 'transfer_request_accepted',
    'account_activated', 'account_created', 'admin_approved',
  ];
  const negative = [
    'cattle_rejected', 'identification_failed', 'transfer_request_rejected',
    'account_deactivated', 'identification_not_found', 'admin_rejected',
  ];
  const warning = [
    'verification_overdue', 'ml_identification_failed', 'verification_reminder',
  ];

  if (positive.includes(type)) return { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
  if (negative.includes(type)) return { icon: 'close-circle', color: '#EF4444', bg: '#FEF2F2' };
  if (warning.includes(type)) return { icon: 'warning', color: '#F59E0B', bg: '#FEF3C7' };
  return { icon: 'notifications', color: '#3B82F6', bg: '#EFF6FF' };
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

// ── Main screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(1, filter, false);
    }, [filter])
  );

  const loadNotifications = async (
    pageNum: number,
    activeFilter: 'all' | 'unread',
    append: boolean
  ) => {
    try {
      if (pageNum === 1 && !append) {
        if (!refreshing) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params: any = { page: pageNum, limit: 20 };
      if (activeFilter === 'unread') params.isRead = false;

      const result = await userAPI.getNotifications(params);
      const data = result.data;

      setUnreadCount(data.unreadCount ?? 0);
      setTotalPages(data.pagination?.pages ?? 1);

      if (append) {
        setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
      } else {
        setNotifications(data.notifications ?? []);
      }
      setPage(pageNum);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load notifications' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(1, filter, false);
  };

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    setNotifications([]);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    try {
      await userAPI.markAllNotificationsRead();
      Toast.show({ type: 'success', text1: 'All notifications marked as read' });
      loadNotifications(1, filter, false);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to mark notifications as read' });
    }
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await userAPI.markNotificationRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch { /* non-critical */ }
    }

    // Navigate to related entity
    if (notification.relatedCattle?._id) {
      router.push(`/(user)/cattle/${notification.relatedCattle._id}` as any);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      loadNotifications(page + 1, filter, true);
    }
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
        <SafeAreaView className="flex-1" style={{ backgroundColor: '#F9FAFB' }} edges={['top']}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-3 text-sm">Loading notifications...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <ScrollView
          style={{ backgroundColor: '#F9FAFB' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isNearBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
            if (isNearBottom) handleLoadMore();
          }}
          scrollEventThrottle={400}
        >
          {/* Header */}
          <View className="px-4 pt-3 pb-6 rounded-b-[28px]" style={{ backgroundColor: '#1E40AF' }}>
            <View className="flex-row items-center justify-between mb-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-white/20 rounded-full p-2"
              >
                <Ionicons name="arrow-back" size={22} color="white" />
              </TouchableOpacity>

              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  className="bg-white/20 rounded-full px-4 py-2"
                >
                  <Text className="text-white text-xs font-semibold">Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-white text-2xl font-bold mt-2">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-white/80 text-sm mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Filter Tabs */}
          <View className="flex-row px-4 mt-4 mb-2">
            {(['all', 'unread'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => handleFilterChange(f)}
                className={`mr-3 px-5 py-2 rounded-full ${
                  filter === f ? 'bg-blue-600' : 'bg-white border border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-semibold capitalize ${
                    filter === f ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {f}
                  {f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notification List */}
          <View className="px-4 pb-6">
            {notifications.length === 0 ? (
              <View className="bg-white rounded-2xl p-12 items-center mt-4">
                <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
                <Text className="text-gray-500 font-semibold mt-4 text-base">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : "We'll notify you about your cattle activity here"}
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                />
              ))
            )}

            {loadingMore && (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Notification Card ────────────────────────────────────────────────────────

const NotificationCard = ({ notification, onPress }: any) => {
  const style = getNotificationStyle(notification.type);
  const hasAction = !!notification.relatedCattle?._id;

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-2xl p-4 mb-3 flex-row ${
        notification.isRead ? 'bg-white' : 'bg-blue-50'
      }`}
      style={
        !notification.isRead
          ? { borderLeftWidth: 3, borderLeftColor: '#3B82F6' }
          : { borderLeftWidth: 3, borderLeftColor: 'transparent' }
      }
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: style.bg }}
      >
        <Ionicons name={style.icon as any} size={22} color={style.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text
            className={`flex-1 text-sm mr-2 ${
              notification.isRead ? 'text-gray-900 font-medium' : 'text-gray-900 font-bold'
            }`}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          {!notification.isRead && (
            <View className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
          )}
        </View>

        <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
          {notification.message}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-gray-400 text-xs">
            {getRelativeTime(notification.createdAt)}
          </Text>

          <View className="flex-row items-center gap-2">
            {notification.relatedCattle?.cattleId && (
              <View className="bg-gray-100 rounded-full px-2.5 py-0.5">
                <Text className="text-gray-600 text-xs font-medium">
                  {notification.relatedCattle.cattleId}
                </Text>
              </View>
            )}
            {hasAction && (
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

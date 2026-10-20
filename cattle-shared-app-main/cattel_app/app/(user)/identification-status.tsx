import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { cattleAPI } from '../../src/api/endpoints/cattle';
import { format } from 'date-fns';
import ENV from '../../src/config/env';

const SERVER_URL = ENV.API_BASE_URL.replace('/api/v1', '');

/** Convert a backend relative image path to a full URL */
const toFullUrl = (relPath?: string): string | null => {
  if (!relPath) return null;
  return `${SERVER_URL}${relPath}`;
};

export default function IdentificationStatusScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [statistics, setStatistics] = useState<any>(null);

  const fetchRequests = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const statusParam = filter === 'all' ? undefined : filter;
      const [listRes, statsRes] = await Promise.all([
        cattleAPI.getMyIdentificationRequests(statusParam),
        cattleAPI.getIdentificationStatistics(),
      ]);
      setRequests(listRes.data?.requests || []);
      setStatistics(statsRes.data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Failed to load identification requests',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [filter])
  );

  const onRefresh = () => { setRefreshing(true); fetchRequests(false); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':    return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Verification In Progress' };
      case 'processing': return { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Under Review' };
      case 'completed':  return { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completed' };
      case 'failed':     return { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Failed' };
      case 'cancelled':  return { bg: 'bg-gray-100',   text: 'text-gray-800',   label: 'Cancelled' };
      default:           return { bg: 'bg-gray-100',   text: 'text-gray-800',   label: status };
    }
  };

  const renderRequestCard = (request: any) => {
    const statusBadge = getStatusBadge(request.status);
    const isIdentified = request.result?.found;

    return (
      <Pressable
        key={request._id}
        onPress={() => router.push(`/(user)/identification-detail?id=${request._id}`)}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-4"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className={`px-3 py-1 rounded-full ${statusBadge.bg}`}>
            <Text className={`text-sm font-semibold ${statusBadge.text}`}>{statusBadge.label}</Text>
          </View>
          <Text className="text-sm text-gray-500">
            {format(new Date(request.createdAt), 'MMM dd, yyyy')}
          </Text>
        </View>

        <Text className="text-xs text-gray-500 mb-2">Request ID: {request.requestId}</Text>

        {/* Image thumbnails */}
        <View className="flex-row space-x-2 mb-3">
          {(['front', 'back', 'right', 'left'] as const).map((view) => {
            const uri = toFullUrl(request.images?.[view]?.url);
            return uri ? (
              <Image key={view} source={{ uri }} className="w-16 h-16 rounded-md" resizeMode="cover" />
            ) : null;
          })}
        </View>

        {request.status === 'completed' && (
          <View className={`border-t pt-3 ${isIdentified ? 'border-green-200' : 'border-gray-200'}`}>
            {isIdentified ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="ml-2 text-green-700 font-semibold">
                  Identified: {request.result.cattleId}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text className="ml-2 text-red-700 font-semibold">No match found</Text>
              </View>
            )}
            {request.result?.message && (
              <Text className="text-sm text-gray-600 mt-1">{request.result.message}</Text>
            )}
          </View>
        )}

        {request.status === 'failed' && (
          <View className="border-t border-red-200 pt-3">
            <View className="flex-row items-center">
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text className="ml-2 text-red-700 font-semibold">Rejected</Text>
            </View>
            {request.result?.message && (
              <Text className="text-sm text-gray-600 mt-1">{request.result.message}</Text>
            )}
          </View>
        )}

        {request.status === 'pending' && (
          <View className="border-t border-yellow-200 pt-3">
            <Text className="text-sm text-gray-600">
              Waiting for verification. This may take up to 24 hours.
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-end mt-2">
          <Text className="text-sm text-blue-600">View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#2563EB" />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text className="text-lg font-bold">Identification Requests</Text>
          <Pressable onPress={() => router.push('/(user)/identify')} className="p-2">
            <Ionicons name="add-circle" size={28} color="#3B82F6" />
          </Pressable>
        </View>
      </View>

      {/* Statistics */}
      {statistics && (
        <View className="bg-white mx-4 mt-4 rounded-lg p-4 border border-gray-200">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-800">{statistics.total || 0}</Text>
              <Text className="text-sm text-gray-600">Total</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-yellow-600">{statistics.pending || 0}</Text>
              <Text className="text-sm text-gray-600">Pending</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{statistics.found || 0}</Text>
              <Text className="text-sm text-gray-600">Identified</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-600">{statistics.notFound || 0}</Text>
              <Text className="text-sm text-gray-600">Not Found</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View className="flex-row bg-white mx-4 mt-4 rounded-lg p-1 border border-gray-200">
        {(['all', 'pending', 'completed', 'failed'] as const).map((status) => (
          <Pressable
            key={status}
            onPress={() => setFilter(status)}
            className={`flex-1 py-2 rounded-md ${filter === status ? 'bg-blue-500' : 'bg-transparent'}`}
          >
            <Text className={`text-center text-sm font-semibold ${filter === status ? 'text-white' : 'text-gray-600'}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-500 mt-2">Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View className="py-20 items-center">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">No identification requests found</Text>
            <Pressable
              onPress={() => router.push('/(user)/identify')}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Create Request</Text>
            </Pressable>
          </View>
        ) : (
          <View className="pb-6">{requests.map((request) => renderRequestCard(request))}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

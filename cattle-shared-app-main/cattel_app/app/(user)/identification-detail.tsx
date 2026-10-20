import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function IdentificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await cattleAPI.getIdentificationRequestById(id);
      setRequest(response.data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Failed to load request details',
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this identification request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cattleAPI.cancelIdentificationRequest(id, 'Cancelled by user');
              Toast.show({ type: 'success', text1: 'Request Cancelled', text2: 'Your identification request has been cancelled' });
              router.back();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error?.response?.data?.message || 'Failed to cancel request',
              });
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text className="text-gray-900 text-lg font-bold mt-3">Not Found</Text>
        <Text className="text-gray-600 text-center mt-2 text-sm">This request could not be loaded.</Text>
        <Pressable onPress={() => router.back()} className="bg-blue-600 px-6 py-2.5 rounded-full mt-4">
          <Text className="text-white font-bold text-sm">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':    return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' };
      case 'processing': return { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Processing' };
      case 'completed':  return { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completed' };
      case 'failed':     return { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rejected' };
      case 'cancelled':  return { bg: 'bg-gray-100',   text: 'text-gray-800',   label: 'Cancelled' };
      default:           return { bg: 'bg-gray-100',   text: 'text-gray-800',   label: status };
    }
  };

  const statusBadge = getStatusBadge(request.status);
  const isIdentified = request.result?.found;
  const canCancel = request.status === 'pending' || request.status === 'processing';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-bold">Request Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Status Card */}
        <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <View className={`px-3 py-1 rounded-full ${statusBadge.bg}`}>
              <Text className={`text-sm font-semibold ${statusBadge.text}`}>{statusBadge.label}</Text>
            </View>
            <Text className="text-sm text-gray-500">
              {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>

          <Text className="text-xs text-gray-500 mb-2">Request ID: {request.requestId}</Text>

          {request.status === 'pending' && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <Text className="text-yellow-800 text-sm">
                Your identification request is pending verification. This may take up to 24 hours.
              </Text>
            </View>
          )}

          {request.status === 'processing' && (
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <Text className="text-blue-800 text-sm">
                Your request is currently being processed by our verification team.
              </Text>
            </View>
          )}
        </View>

        {/* Uploaded Images */}
        <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-800 mb-3">Uploaded Images</Text>
          {(['front', 'back', 'right', 'left'] as const).map((view) => {
            const uri = toFullUrl(request.images?.[view]?.url);
            return (
              <View key={view} className="mb-3">
                <Text className="text-sm text-gray-600 mb-2 capitalize font-medium">{view} View</Text>
                {uri ? (
                  <Image source={{ uri }} className="w-full h-48 rounded-lg" resizeMode="cover" />
                ) : (
                  <View className="w-full h-48 rounded-lg bg-gray-100 items-center justify-center">
                    <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Result */}
        {request.status === 'completed' && (
          <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <Text className="text-base font-semibold text-gray-800 mb-3">Identification Result</Text>
            {isIdentified ? (
              <View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text className="ml-2 text-green-700 font-semibold text-base">Cattle Identified!</Text>
                </View>
                <View className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                  <Text className="text-gray-700 font-medium mb-1">Cattle ID:</Text>
                  <Text className="text-gray-900 text-lg font-bold">{request.result.cattleId}</Text>
                  {request.result.message && (
                    <Text className="text-gray-600 text-sm mt-2">{request.result.message}</Text>
                  )}
                  {request.processing?.timeTaken && (
                    <Text className="text-gray-500 text-xs mt-2">
                      Processing time: {request.processing.timeTaken} seconds
                    </Text>
                  )}
                </View>
                {request.result.cattle && (
                  <Pressable
                    onPress={() => router.push(`/(user)/cattle/${request.result.cattle}`)}
                    className="bg-green-600 rounded-lg p-3 mt-3 flex-row items-center justify-center"
                  >
                    <Ionicons name="eye" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">View Cattle Details</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                  <Text className="ml-2 text-red-700 font-semibold text-base">No Match Found</Text>
                </View>
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <Text className="text-gray-700 text-sm">
                    {request.result.message || 'The uploaded cattle images could not be matched with any of your registered cattle.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {request.status === 'failed' && (
          <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <Text className="text-base font-semibold text-gray-800 mb-3">Request Failed</Text>
            <View className="flex-row items-center mb-2">
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text className="ml-2 text-red-700 font-semibold text-base">Rejected</Text>
            </View>
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <Text className="text-gray-700 text-sm">
                {request.result?.message || 'Your identification request could not be processed.'}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {canCancel && (
          <Pressable
            onPress={handleCancel}
            disabled={cancelling}
            className="bg-red-600 rounded-lg p-4 flex-row items-center justify-center mb-4"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {cancelling ? 'Cancelling...' : 'Cancel Request'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push('/(user)/identify')}
          className="bg-purple-600 rounded-lg p-4 flex-row items-center justify-center mb-8"
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Create New Request</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

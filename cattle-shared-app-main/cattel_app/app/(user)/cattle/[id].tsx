import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { cattleAPI, buildCattleImageUrl } from '../../../src/api/endpoints/cattle';

const { width } = Dimensions.get('window');

export default function CattleDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [cattle, setCattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => { fetchCattleDetails(); }, [id]);

  const fetchCattleDetails = async () => {
    try {
      const response = await cattleAPI.getCattleById(id as string);
      setCattle(response?.data ?? null);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load cattle',
        visibilityTime: 3000,
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Cattle',
      'This will permanently delete this cattle and all its images. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setArchiving(true);
              await cattleAPI.deleteCattle(id as string);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Cattle deleted permanently', visibilityTime: 2000 });
              router.back();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: error.response?.data?.message || 'Failed to delete cattle', visibilityTime: 3000 });
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  const handleArchive = async () => {
    try {
      setArchiving(true);
      await cattleAPI.archiveCattle(id as string);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Cattle moved to archive', visibilityTime: 2000 });
      await fetchCattleDetails();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Archive Failed',
        text2: error.response?.data?.message || 'Failed to archive cattle',
        visibilityTime: 3000,
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    try {
      setArchiving(true);
      await cattleAPI.restoreCattle(id as string);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Cattle restored from archive', visibilityTime: 2000 });
      await fetchCattleDetails();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Restore Failed',
        text2: error.response?.data?.message || 'Failed to restore cattle',
        visibilityTime: 3000,
      });
    } finally {
      setArchiving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'archive': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'transit': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getVerificationText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending_regional_review: 'Pending Review',
      forwarded_to_m_admin: 'Forwarded',
      pending_m_admin_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      denied_by_regional: 'Denied',
      pending_verification: 'Pending Verification',
    };
    return statusMap[status] || status;
  };

  const getMLStatusInfo = (mlStatus: string) => {
    switch (mlStatus) {
      case 'registered':
        return { label: 'AI Registered', color: 'bg-green-100 text-green-800', icon: '✓' };
      case 'in_progress':
        return { label: 'AI Registration In Progress', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
      case 'manual_pending':
        return { label: 'AI Registration Pending (Manual Review)', color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
      case 'failed':
        return { label: 'AI Registration Failed', color: 'bg-red-100 text-red-800', icon: '✗' };
      default:
        return { label: 'AI Registration Pending', color: 'bg-gray-100 text-gray-700', icon: '○' };
    }
  };

  const renderImageCategory = (title: string, category: string, images: any[]) => {
    if (!images?.length) return null;
    const imageSize = (width - 48) / 4;
    return (
      <View className="mb-4">
        <Text className="text-sm font-bold text-gray-900 mb-2">{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {images.map((img, index) => {
              const uri = buildCattleImageUrl(category, img.filename);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => { setSelectedImage(uri); setImageModalVisible(true); }}
                  className="mr-2"
                >
                  <Image
                    source={{ uri }}
                    className="rounded-lg bg-gray-200"
                    style={{ width: imageSize, height: imageSize }}
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1">
                    <Ionicons name="expand-outline" size={12} color="white" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-3 text-sm">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!cattle) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
        <Text className="text-gray-900 text-lg font-bold mt-3">Not Found</Text>
        <Text className="text-gray-600 text-center mt-2 text-sm">This cattle may have been deleted.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-blue-600 px-6 py-2.5 rounded-full mt-4">
          <Text className="text-white font-bold text-sm">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">{cattle.cattleId || 'N/A'}</Text>
          <Text className="text-xs text-gray-600">{cattle.breed}</Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full border ${getStatusColor(cattle.status)}`}>
          <Text className="font-bold text-xs capitalize">{cattle.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View className="bg-gray-50 mx-4 mt-4 rounded-xl p-3">
          <Text className="text-sm font-bold text-gray-900 mb-3">Information</Text>
          <InfoRow label="ID" value={cattle.cattleId || 'N/A'} />
          <InfoRow label="Breed" value={cattle.breed} />
          <InfoRow label="Age" value={`${cattle.age} years`} />
          {cattle.tagNo && <InfoRow label="Tag" value={cattle.tagNo} />}
          {cattle.type && <InfoRow label="Type" value={cattle.type} />}
          {cattle.color && <InfoRow label="Color" value={cattle.color} />}
          {cattle.medicalHistory && (
            <View className="mt-2 pt-2 border-t border-gray-200">
              <Text className="text-xs font-semibold text-gray-700 mb-1">Medical History</Text>
              <Text className="text-xs text-gray-600">{cattle.medicalHistory}</Text>
            </View>
          )}
        </View>

        {/* Verification */}
        <View className="bg-blue-50 mx-4 mt-3 rounded-xl p-3">
          <Text className="text-sm font-bold text-gray-900 mb-3">Verification</Text>
          <InfoRow label="Status" value={getVerificationText(cattle.verification?.status || 'Unknown')} />
          {cattle.verification?.submittedAt && (
            <InfoRow label="Submitted" value={new Date(cattle.verification.submittedAt).toLocaleDateString()} />
          )}
        </View>

        {/* AI Registration Status */}
        {(() => {
          const mlInfo = getMLStatusInfo(cattle.mlRegistration?.status);
          return (
            <View className="mx-4 mt-3 rounded-xl p-3 border border-gray-200 bg-white">
              <Text className="text-sm font-bold text-gray-900 mb-2">AI Identification System</Text>
              <View className={`flex-row items-center px-3 py-2 rounded-lg ${mlInfo.color}`}>
                <Text className="text-sm font-semibold">{mlInfo.icon} {mlInfo.label}</Text>
              </View>
              {cattle.mlRegistration?.status === 'in_progress' && (
                <Text className="text-xs text-gray-500 mt-2">
                  Our AI system is processing your cattle registration. This usually completes within 2 hours.
                </Text>
              )}
              {cattle.mlRegistration?.status === 'manual_pending' && (
                <Text className="text-xs text-gray-500 mt-2">
                  Our team is manually adding your cattle to the AI system. You will be notified once complete.
                </Text>
              )}
            </View>
          );
        })()}

        {/* Images */}
        <View className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-900 mb-3">
            Images ({
              (cattle.images?.muzzle?.length || 0) +
              (cattle.images?.face?.length || 0) +
              (cattle.images?.left?.length || 0) +
              (cattle.images?.right?.length || 0) +
              (cattle.images?.fullBodyLeft?.length || 0) +
              (cattle.images?.fullBodyRight?.length || 0)
            })
          </Text>
          {renderImageCategory('Muzzle', 'muzzle', cattle.images?.muzzle)}
          {renderImageCategory('Face', 'face', cattle.images?.face)}
          {(cattle.images?.left?.length || 0) > 0 &&
            renderImageCategory('Left', 'left', cattle.images?.left)}
          {(cattle.images?.right?.length || 0) > 0 &&
            renderImageCategory('Right', 'right', cattle.images?.right)}
          {renderImageCategory('Full Body Left', 'fullBodyLeft', cattle.images?.fullBodyLeft)}
          {renderImageCategory('Full Body Right', 'fullBodyRight', cattle.images?.fullBodyRight)}
        </View>

        {/* Actions */}
        <View className="mx-4 my-5">
          {cattle.status === 'archive' ? (
            <TouchableOpacity
              onPress={handleRestore}
              disabled={archiving}
              className="bg-blue-600 rounded-xl py-3.5 flex-row items-center justify-center"
            >
              {archiving ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text className="text-white font-bold text-sm ml-2">Restore</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleArchive}
                disabled={archiving}
                className="bg-red-50 border border-red-200 rounded-xl py-3.5 mb-2 flex-row items-center justify-center"
              >
                {archiving ? <ActivityIndicator color="#DC2626" /> : (
                  <>
                    <Ionicons name="archive" size={20} color="#DC2626" />
                    <Text className="text-red-700 font-bold text-sm ml-2">Archive</Text>
                  </>
                )}
              </TouchableOpacity>
              {cattle.status === 'active' && (
                <TouchableOpacity
                  className="bg-blue-600 rounded-xl py-3.5 flex-row items-center justify-center"
                  onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Transfer feature will be available soon' })}
                >
                  <Ionicons name="swap-horizontal" size={20} color="white" />
                  <Text className="text-white font-bold text-sm ml-2">Transfer</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Delete — always visible */}
          <TouchableOpacity
            onPress={handleDelete}
            disabled={archiving}
            className="mt-2 border border-red-400 rounded-xl py-3.5 flex-row items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text className="text-red-600 font-bold text-sm ml-2">Delete Permanently</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Lightbox Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1" edges={['top']}>
            <TouchableOpacity
              onPress={() => setImageModalVisible(false)}
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 50 : 20,
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 20,
                padding: 10,
              }}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between items-center py-1.5">
    <Text className="text-xs font-medium text-gray-600">{label}</Text>
    <Text className="text-xs text-gray-900 font-semibold flex-1 text-right ml-2" numberOfLines={1}>{value}</Text>
  </View>
);

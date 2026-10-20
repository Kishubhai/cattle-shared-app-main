import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CattleCardProps {
  cattle: any;
  onPress: () => void;
}

export default function CattleCard({ cattle, onPress }: CattleCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      case 'archived':
        return 'archive';
      default:
        return 'help-circle';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl mb-4 overflow-hidden active:opacity-80"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {/* Image */}
      <View className="relative">
        <Image
          source={{ uri: cattle.images?.muzzle?.[0] || 'https://via.placeholder.com/400x200' }}
          className="w-full h-48"
          resizeMode="cover"
        />
        
        {/* Status Badge */}
        <View className={`absolute top-3 right-3 px-3 py-1.5 rounded-full flex-row items-center ${getStatusColor(cattle.status || cattle.approvalStatus)}`}>
          <Ionicons name={getStatusIcon(cattle.status || cattle.approvalStatus)} size={14} color={cattle.status === 'approved' || cattle.status === 'active' ? '#166534' : cattle.status === 'pending' ? '#854D0E' : '#991B1B'} />
          <Text className={`ml-1 text-xs font-semibold capitalize ${getStatusColor(cattle.status || cattle.approvalStatus)}`}>
            {cattle.status || cattle.approvalStatus}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {cattle.breed || 'Unknown Breed'}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-1">
                Tag: {cattle.tagNumber || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Grid */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1">
              Age: {cattle.age || 'N/A'} years
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {new Date(cattle.registrationDate || cattle.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ensureImageQuality } from '../../utils/imageQuality';

interface ImageUploadGridProps {
  label: string;
  required: number;
  images: string[];
  onImagesChange: (images: string[]) => void;
  error?: string;
}

export default function ImageUploadGrid({
  label,
  required,
  images,
  onImagesChange,
  error,
}: ImageUploadGridProps) {
  const [checking, setChecking] = useState(false);

  const acceptImage = async (uri: string, retake: () => void) => {
    setChecking(true);
    try {
      const ok = await ensureImageQuality(uri, retake);
      if (ok) {
        onImagesChange([...images, uri]);
      }
    } finally {
      setChecking(false);
    }
  };

  const showPermissionDenied = (kind: 'camera' | 'gallery') => {
    Alert.alert(
      'Permission Required',
      kind === 'camera'
        ? 'Camera access is blocked. Enable it in Settings → Apps → Cattel → Permissions.'
        : 'Photos access is blocked. Enable it in Settings → Apps → Cattel → Permissions.',
      [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async () => {
    if (images.length >= required) {
      Alert.alert('Limit Reached', `You can only upload ${required} images for ${label}`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPermissionDenied('gallery');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await acceptImage(result.assets[0].uri, pickImage);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not open gallery. Please try again.');
    }
  };

  const takePhoto = async () => {
    if (images.length >= required) {
      Alert.alert('Limit Reached', `You can only upload ${required} images for ${label}`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPermissionDenied('camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await acceptImage(result.assets[0].uri, takePhoto);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not open camera. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const showOptions = () => {
    if (checking) return;
    Alert.alert('Upload Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderImageSlot = (index: number) => {
    const hasImage = images[index];

    if (hasImage) {
      return (
        <View className="relative flex-1 aspect-square bg-gray-100 rounded-xl overflow-hidden m-1">
          <Image source={{ uri: images[index] }} className="w-full h-full" />
          <Pressable
            onPress={() => removeImage(index)}
            className="absolute top-2 right-2 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        onPress={showOptions}
        disabled={checking}
        className={`flex-1 aspect-square bg-gray-50 rounded-xl items-center justify-center m-1 border-2 border-dashed ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        {checking ? (
          <ActivityIndicator color="#3B82F6" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
            <Text className="text-gray-500 text-xs mt-2">{index + 1}</Text>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-900 font-semibold text-base">{label}</Text>
        <View className="bg-blue-100 px-3 py-1 rounded-full">
          <Text className="text-blue-800 text-xs font-semibold">
            {images.length}/{required} uploaded
          </Text>
        </View>
      </View>

      <Text className="text-gray-500 text-xs mb-2">
        Blurry or poorly lit photos will be rejected — retake with steady focus.
      </Text>

      <View className="flex-row flex-wrap -m-1">
        {Array.from({ length: required }).map((_, index) => (
          <View key={index} style={{ width: required === 1 ? '100%' : '48.5%' }}>
            {renderImageSlot(index)}
          </View>
        ))}
      </View>

      {error && <Text className="text-red-500 text-xs mt-2">{error}</Text>}
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ensureImageQuality } from '../../utils/imageQuality';

interface ImagePickerComponentProps {
  label?: string;
  onImageSelect: (uri: string) => void;
  imageUri?: string;
  error?: string;
}

export default function ImagePickerComponent({
  label,
  onImageSelect,
  imageUri,
  error,
}: ImagePickerComponentProps) {
  const [loading, setLoading] = useState(false);

  const acceptImage = async (uri: string, retake: () => void) => {
    setLoading(true);
    try {
      const ok = await ensureImageQuality(uri, retake);
      if (ok) {
        onImageSelect(uri);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload your photo.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await acceptImage(result.assets[0].uri, pickImage);
      } else {
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await acceptImage(result.assets[0].uri, takePhoto);
      } else {
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      setLoading(false);
    }
  };

  const showOptions = () => {
    if (loading) return;
    Alert.alert('Upload Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View className="mb-4">
      {label && <Text className="text-gray-700 font-medium mb-2 text-sm">{label}</Text>}

      <Pressable
        onPress={showOptions}
        disabled={loading}
        className={`
          border-2 border-dashed rounded-xl p-4 items-center justify-center
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${imageUri ? 'border-blue-500' : ''}
        `}
        style={{ height: 180 }}
      >
        {loading ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-500 text-xs mt-2">Checking image quality...</Text>
          </View>
        ) : imageUri ? (
          <View className="w-full h-full">
            <Image source={{ uri: imageUri }} className="w-full h-full rounded-lg" />
            <View className="absolute bottom-2 right-2 bg-blue-600 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">Change</Text>
            </View>
          </View>
        ) : (
          <View className="items-center">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
              <Text className="text-3xl">📷</Text>
            </View>
            <Text className="text-gray-600 font-medium mb-1">Upload Profile Photo</Text>
            <Text className="text-gray-400 text-xs">Tap to take photo or choose from gallery</Text>
          </View>
        )}
      </Pressable>

      {error && <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>}
    </View>
  );
}

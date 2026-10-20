import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../src/components/common/Button';
import { cattleAPI } from '../../src/api/endpoints/cattle';
import { getErrorToast } from '../../src/utils/errorHandler';
import { ensureImageQuality, prepareImageForUpload } from '../../src/utils/imageQuality';

type IdentifyView = 'front' | 'back' | 'right' | 'left';

export default function IdentifyCattleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingView, setCheckingView] = useState<IdentifyView | null>(null);

  const [images, setImages] = useState({
    front: null as string | null,
    back: null as string | null,
    right: null as string | null,
    left: null as string | null,
  });

  const [errors, setErrors] = useState<any>({});

  const acceptImage = async (view: IdentifyView, uri: string, retake: () => void) => {
    setCheckingView(view);
    try {
      const ok = await ensureImageQuality(uri, retake);
      if (ok) {
        setImages((prev) => ({ ...prev, [view]: uri }));
        setErrors((prev: any) => ({ ...prev, [view]: '' }));
      }
    } finally {
      setCheckingView(null);
    }
  };

  const pickImage = async (view: IdentifyView) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Permission Denied',
          'Allow photo library access in your device Settings to upload images.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await acceptImage(view, result.assets[0].uri, () => pickImage(view));
      }
    } catch {
      Alert.alert('Image Error', 'Could not open gallery. Please try again.');
    }
  };

  const takePhoto = async (view: IdentifyView) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Denied',
          'Allow camera access in your device Settings to take photos.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await acceptImage(view, result.assets[0].uri, () => takePhoto(view));
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera. Please try again.');
    }
  };

  const removeImage = (view: IdentifyView) => {
    setImages((prev) => ({ ...prev, [view]: null }));
  };

  const VIEW_LABELS: Record<IdentifyView, string> = {
    front: 'Face Image Section A',
    back: 'Face Image Section B',
    right: 'Muzzle Image Section A',
    left: 'Muzzle Image Section B',
  };

  const showImagePickerOptions = (view: IdentifyView) => {
    if (checkingView) return;
    Alert.alert(
      `Upload ${VIEW_LABELS[view]}`,
      'Choose an option. Blurry or dark photos will be rejected.',
      [
        { text: 'Take Photo', onPress: () => takePhoto(view) },
        { text: 'Choose from Gallery', onPress: () => pickImage(view) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateImages = (): boolean => {
    const newErrors: any = {};
    if (!images.front) newErrors.front = 'Face Image Section A is required';
    if (!images.back) newErrors.back = 'Face Image Section B is required';
    if (!images.right) newErrors.right = 'Muzzle Image Section A is required';
    if (!images.left) newErrors.left = 'Muzzle Image Section B is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateImages()) {
      Toast.show({ type: 'error', text1: 'Missing Images', text2: 'Please upload all 4 images (2 face + 2 muzzle)' });
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      for (const view of ['front', 'back', 'right', 'left'] as const) {
        const original = images[view];
        if (original) {
          const uri = await prepareImageForUpload(original);
          formDataToSend.append(view, {
            uri,
            name: `${view}.jpg`,
            type: 'image/jpeg',
          } as any);
        }
      }

      await cattleAPI.createIdentificationRequest(formDataToSend);

      Toast.show({
        type: 'success',
        text1: 'Request Submitted',
        text2: 'Your cattle identification request has been submitted for verification',
      });

      setTimeout(() => router.push('/(user)/identification-status'), 1500);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'identify_cattle');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const renderImageBox = (
    view: IdentifyView,
    label: string,
    description: string
  ) => {
    const hasImage = !!images[view];
    const hasError = !!errors[view];
    const isChecking = checkingView === view;

    return (
      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-800 mb-2">{label}</Text>
        <Text className="text-sm text-gray-600 mb-3">{description}</Text>

        <Pressable
          onPress={() => (hasImage || isChecking ? null : showImagePickerOptions(view))}
          disabled={isChecking}
          className={`border-2 border-dashed rounded-xl p-4 ${
            hasError ? 'border-red-400' : hasImage ? 'border-green-500' : 'border-gray-300'
          }`}
        >
          {isChecking ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-500 mt-2">Checking image quality...</Text>
            </View>
          ) : hasImage ? (
            <View className="relative">
              <Image source={{ uri: images[view]! }} className="w-full h-48 rounded-lg" resizeMode="cover" />
              <Pressable onPress={() => removeImage(view)} className="absolute top-2 right-2 bg-red-500 rounded-full p-2">
                <Ionicons name="trash-outline" size={20} color="white" />
              </Pressable>
              <Pressable onPress={() => showImagePickerOptions(view)} className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-2">
                <Ionicons name="camera-outline" size={20} color="white" />
              </Pressable>
            </View>
          ) : (
            <View className="items-center py-8">
              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">Tap to add photo</Text>
            </View>
          )}
        </Pressable>

        {hasError && <Text className="text-red-500 text-sm mt-1">{errors[view]}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text className="text-lg font-bold">Identify Cattle</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-800 font-semibold mb-1">How it works</Text>
                <Text className="text-blue-700 text-sm">
                  Upload 2 clear face photos and 2 clear muzzle photos. Our system will
                  verify the cattle's identity by matching it with your registered cattle.
                </Text>
              </View>
            </View>
          </View>

          {renderImageBox('front', '1. Face Image Section A', 'Capture a clear face photo of the cattle (section A)')}
          {renderImageBox('back', '2. Face Image Section B', 'Capture a clear face photo of the cattle (section B)')}
          {renderImageBox('right', '3. Muzzle Image Section A', 'Capture a clear muzzle photo of the cattle (section A)')}
          {renderImageBox('left', '4. Muzzle Image Section B', 'Capture a clear muzzle photo of the cattle (section B)')}
        </ScrollView>

        {/* Sticky footer so the submit button stays above the tab bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 12 : 16,
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Button
            title={loading ? 'Submitting...' : 'Submit for Verification'}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

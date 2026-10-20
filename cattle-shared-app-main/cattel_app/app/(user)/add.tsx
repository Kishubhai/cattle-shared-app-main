import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Input from '../../src/components/common/Input';
import Button from '../../src/components/common/Button';
import ImageUploadGrid from '../../src/components/cattle/ImageUploadGrid';
import { cattleAPI } from '../../src/api/endpoints/cattle';
import { getErrorToast } from '../../src/utils/errorHandler';
import { appendCattleRegistrationImages } from '../../src/utils/cattleUpload';

export default function AddCattleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    breed: '',
    tagNumber: '',
    age: '',
    medicalHistory: '',
    images: {
      muzzle: [] as string[],
      face: [] as string[],
      fullBodyLeft: [] as string[],
      fullBodyRight: [] as string[],
    },
  });

  const [errors, setErrors] = useState<any>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const updateImages = (category: string, images: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: { ...prev.images, [category]: images },
    }));
    setErrors((prev: any) => ({
      ...prev,
      images: { ...prev.images, [category]: '' },
    }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: any = {};
    if (!formData.breed.trim()) newErrors.breed = 'Breed is required';
    if (!formData.tagNumber.trim()) newErrors.tagNumber = 'Tag number is required';
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = 'Age must be a valid number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: any = { images: {} };
    if (formData.images.muzzle.length < 5) newErrors.images.muzzle = 'Upload 5 muzzle images';
    if (formData.images.face.length < 5) newErrors.images.face = 'Upload 5 face images';
    if (formData.images.fullBodyLeft.length < 1) newErrors.images.fullBodyLeft = 'Upload full body left image';
    if (formData.images.fullBodyRight.length < 1) newErrors.images.fullBodyRight = 'Upload full body right image';
    setErrors(newErrors);
    return Object.keys(newErrors.images || {}).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('breed', formData.breed);
      formDataToSend.append('tagNo', formData.tagNumber);
      formDataToSend.append('age', formData.age);
      formDataToSend.append('medicalHistory', formData.medicalHistory);

      // Uploads 3 muzzle + 3 face + empty left/right + full bodies;
      // extra 2 muzzle/face stay on device only.
      await appendCattleRegistrationImages(formDataToSend, formData.images);

      await cattleAPI.registerCattle(formDataToSend);

      Toast.show({
        type: 'success',
        text1: 'Cattle Registered Successfully',
        text2: 'Your cattle is being verified by our AI system and team.',
      });

      setFormData({
        breed: '',
        tagNumber: '',
        age: '',
        medicalHistory: '',
        images: { muzzle: [], face: [], fullBodyLeft: [], fullBodyRight: [] },
      });
      setCurrentStep(1);
      setErrors({});

      setTimeout(() => router.replace('/(user)/gallery'), 1500);
    } catch (error: any) {
      const { text1, text2 } = getErrorToast(error, 'register_cattle');
      Toast.show({ type: 'error', text1, text2, visibilityTime: 7000 });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderProgressBar = () => (
    <View className="mb-6">
      <View className="flex-row justify-between mb-2">
        <Text className="text-sm font-medium text-gray-700">Step {currentStep} of 2</Text>
        <Text className="text-sm text-gray-500">
          {currentStep === 1 ? 'Basic Information' : 'Upload Images'}
        </Text>
      </View>
      <View className="flex-row space-x-2">
        {[1, 2].map((step) => (
          <View
            key={step}
            className={`h-2 flex-1 rounded-full ${step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text className="text-2xl font-bold text-gray-800 mb-2">Basic Information</Text>
      <Text className="text-gray-600 mb-6">Enter your cattle's details</Text>

      <Input
        label="Breed"
        placeholder="Enter cattle breed"
        value={formData.breed}
        onChangeText={(text) => updateField('breed', text)}
        error={errors.breed}
        icon={<Ionicons name="paw-outline" size={20} color="#9CA3AF" />}
      />

      <Input
        label="Tag Number"
        placeholder="Enter tag number"
        value={formData.tagNumber}
        onChangeText={(text) => updateField('tagNumber', text)}
        error={errors.tagNumber}
        icon={<Ionicons name="pricetag-outline" size={20} color="#9CA3AF" />}
      />

      <Input
        label="Age (in years)"
        placeholder="Enter age"
        keyboardType="number-pad"
        value={formData.age}
        onChangeText={(text) => updateField('age', text.replace(/[^0-9]/g, ''))}
        error={errors.age}
        icon={<Ionicons name="calendar-outline" size={20} color="#9CA3AF" />}
      />

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2 text-sm">Medical History (Optional)</Text>
        <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 min-h-24">
          <Input
            placeholder="Enter medical history or notes"
            value={formData.medicalHistory}
            onChangeText={(text) => updateField('medicalHistory', text)}
            multiline
            numberOfLines={4}
            style={{ height: 80 }}
          />
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text className="text-2xl font-bold text-gray-800 mb-2">Upload Images</Text>
      <Text className="text-gray-600 mb-4">Upload clear images of your cattle from different angles</Text>

      <View className="bg-blue-50 p-4 rounded-xl mb-6">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={20} color="#2563EB" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-900 font-semibold text-sm mb-1">Important Guidelines</Text>
            <Text className="text-blue-800 text-xs leading-5">
              • Ensure good lighting and clear images{'\n'}
              • Do not capture cattle with face rope or nose rope{'\n'}
              • Capture 5 muzzle + 5 face + full body left/right{'\n'}
              • All 12 photos are uploaded for registration
            </Text>
          </View>
        </View>
      </View>

      <ImageUploadGrid
        label="Muzzle Images"
        required={5}
        images={formData.images.muzzle}
        onImagesChange={(images) => updateImages('muzzle', images)}
        error={errors.images?.muzzle}
      />
      <ImageUploadGrid
        label="Face Images"
        required={5}
        images={formData.images.face}
        onImagesChange={(images) => updateImages('face', images)}
        error={errors.images?.face}
      />
      <ImageUploadGrid
        label="Full Body Left"
        required={1}
        images={formData.images.fullBodyLeft}
        onImagesChange={(images) => updateImages('fullBodyLeft', images)}
        error={errors.images?.fullBodyLeft}
      />
      <ImageUploadGrid
        label="Full Body Right"
        required={1}
        images={formData.images.fullBodyRight}
        onImagesChange={(images) => updateImages('fullBodyRight', images)}
        error={errors.images?.fullBodyRight}
      />

      <View className="bg-green-50 p-4 rounded-xl">
        <Text className="text-green-800 font-semibold text-sm">
          Total Images: {Object.values(formData.images).flat().length}/12
        </Text>
      </View>
    </>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          style={{ backgroundColor: '#F9FAFB' }}
        >
          <View className="px-6 py-4 flex-row items-center" style={{ backgroundColor: '#1E40AF' }}>
            <Pressable onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Register Cattle</Text>
              <Text className="text-white/80 text-xs mt-0.5">Step {currentStep} of 2</Text>
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} style={{ backgroundColor: '#F9FAFB' }}>
            <View className="px-6 pt-6 pb-4">
              {renderProgressBar()}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}

              <View className="mt-6 mb-4">
                {currentStep < 2 ? (
                  <>
                    <Button title="Continue" onPress={handleNextStep} />
                    <View style={{ height: 12 }} />
                    <Button title="Cancel" onPress={() => router.back()} variant="outline" />
                  </>
                ) : (
                  <>
                    <Button title="Submit for Verification" onPress={handleSubmit} loading={loading} />
                    <View style={{ height: 12 }} />
                    <Button title="Previous" onPress={handlePreviousStep} variant="outline" />
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

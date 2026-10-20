import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const steps = [
  {
    id: 1,
    icon: 'person-add-outline',
    title: 'Create Your Account',
    color: '#3B82F6',
    bg: '#EFF6FF',
    points: [
      'Open the app and tap "Sign Up" on the main screen.',
      'Fill in your First Name, Last Name, Email, Mobile Number, Date of Birth, Occupation and Address (House/Street, District, State, Pin Code).',
      'Set a strong password and confirm it.',
      'Verify your mobile number with the OTP sent via SMS.',
    ],
  },
  {
    id: 2,
    icon: 'log-in-outline',
    title: 'Login to Your Account',
    color: '#10B981',
    bg: '#ECFDF5',
    points: [
      'Use your Mobile Number and Password to log in.',
      'Alternatively, use "Login by OTP" to receive a one-time password on your mobile.',
      'If you forget your password, tap "Forgot Password" and enter your mobile number to reset it via OTP.',
    ],
  },
  {
    id: 3,
    icon: 'add-circle-outline',
    title: 'Register Your Cattle',
    color: '#F59E0B',
    bg: '#FFFBEB',
    points: [
      'Go to the Gallery tab and tap the "New" button.',
      'Enter cattle details: Breed, Tag Number, Age and Medical History.',
      'Capture and upload 12 photos:\n  • Muzzle: 5 photos\n  • Face: 5 photos\n  • Full body left: 1 photo\n  • Full body right: 1 photo',
      'Important: Do NOT capture images with a face rope or nose rope on the cattle.',
      'Review all details and tap "Submit".',
    ],
  },
  {
    id: 4,
    icon: 'time-outline',
    title: 'Verification Process',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    points: [
      'After submission, your cattle will appear under the "Transit" tab — this means it is pending verification.',
      'The system automatically checks if the cattle is already registered. Duplicates will be declined.',
      'The verification team will review your submission within 48 hours.',
      'You will be notified once the decision is made.',
    ],
  },
  {
    id: 5,
    icon: 'layers-outline',
    title: 'Managing Your Cattle',
    color: '#EF4444',
    bg: '#FEF2F2',
    points: [
      'View all your cattle in the Gallery tab.',
      'Filter by status: Active (approved), Transit (pending), Archive (removed).',
      'Tap any cattle to see its full details, images and unique Class ID.',
      'Use the "Archive" option to move cattle to the recycle bin.',
      'Use the "Sell" option to initiate an ownership transfer to another farmer.',
    ],
  },
  {
    id: 6,
    icon: 'settings-outline',
    title: 'Account & Settings',
    color: '#6B7280',
    bg: '#F9FAFB',
    points: [
      'Go to Settings to update your personal information or profile picture.',
      'Change your password anytime from Settings → Change Password.',
      'View Transfer Requests to track pending buy/sell activity.',
      'Tap Logout to safely sign out of the app.',
    ],
  },
];

export default function InstructionsScreen() {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#F9FAFB' }}>
          {/* Header */}
          <View className="px-5 pt-4 pb-20" style={{ backgroundColor: '#1E40AF' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-3"
            >
              <Ionicons name="arrow-back" size={22} color="white" />
              <Text className="text-white text-sm ml-2 font-medium">Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Instructions</Text>
            <Text className="text-white/80 text-sm mt-1">Learn how to use the Cattle ID app</Text>
          </View>

          {/* Intro Card */}
          <View className="px-4 -mt-10 mb-4">
            <View className="bg-white rounded-2xl p-4 shadow-md flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="book-outline" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-sm">Quick Guide</Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Follow these steps to register and manage your cattle securely.
                </Text>
              </View>
            </View>
          </View>

          {/* Steps */}
          <View className="px-4 pb-8">
            {steps.map((step) => (
              <TouchableOpacity
                key={step.id}
                onPress={() => setExpanded(expanded === step.id ? null : step.id)}
                activeOpacity={0.85}
                className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden"
              >
                {/* Step Header */}
                <View className="flex-row items-center px-4 py-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: step.bg }}
                  >
                    <Ionicons name={step.icon as any} size={20} color={step.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase" style={{ color: step.color }}>
                      Step {step.id}
                    </Text>
                    <Text className="text-gray-900 font-bold text-sm">{step.title}</Text>
                  </View>
                  <Ionicons
                    name={expanded === step.id ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9CA3AF"
                  />
                </View>

                {/* Step Body */}
                {expanded === step.id && (
                  <View className="px-4 pb-4">
                    <View className="h-px bg-gray-100 mb-3" />
                    {step.points.map((point, i) => (
                      <View key={i} className="flex-row mb-2">
                        <View
                          className="w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5"
                          style={{ backgroundColor: step.bg }}
                        >
                          <Text className="text-xs font-bold" style={{ color: step.color }}>
                            {i + 1}
                          </Text>
                        </View>
                        <Text className="text-gray-600 text-sm flex-1 leading-5">{point}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Note */}
            <View className="bg-blue-50 rounded-2xl p-4 mt-2 flex-row">
              <Ionicons name="shield-checkmark-outline" size={20} color="#3B82F6" className="mr-3 mt-0.5" />
              <Text className="text-blue-700 text-xs flex-1 leading-5 ml-2">
                All cattle registrations go through a secure verification process. Your data and cattle records are protected at all times.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

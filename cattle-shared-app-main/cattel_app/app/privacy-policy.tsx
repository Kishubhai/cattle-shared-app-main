import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const sections = [
  {
    icon: 'information-circle-outline',
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Information We Collect',
    content: [
      'Personal details: Name, email address, mobile number, date of birth and occupation.',
      'Address information: House/Street, District, State, Country and Pin Code.',
      'Profile picture uploaded by you.',
      'Cattle details: Breed, Tag Number, Age, Medical History and the 14 identification photos.',
      'Device information: App version, device type and OS version for technical support.',
      'Location data (optional): GPS coordinates when you register cattle, used only for region mapping.',
    ],
  },
  {
    icon: 'eye-outline',
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'How We Use Your Information',
    content: [
      'To create and manage your farmer account.',
      'To register, verify and track your cattle records in the national database.',
      'To send OTPs and important notifications about your submissions.',
      'To enable ownership transfers between registered farmers.',
      'To generate regional and national reports for authorized administrators.',
      'To improve the App and resolve technical issues.',
    ],
  },
  {
    icon: 'share-social-outline',
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'Information Sharing',
    content: [
      'Your data is shared ONLY with authorized Regional Admins and Super Admins within the system.',
      'We do not sell, rent or trade your personal information to any third party.',
      'We may disclose information if required by law or court order.',
      'Cattle records (not personal details) may be used in anonymized, aggregate form for research.',
    ],
  },
  {
    icon: 'lock-closed-outline',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    title: 'Data Security',
    content: [
      'All data is transmitted over encrypted HTTPS connections.',
      'Passwords are stored using industry-standard hashing (bcrypt).',
      'Access to the admin panel is restricted and role-based.',
      'Your account is protected by OTP-based login and password policies.',
      'We regularly review our security practices to protect your data.',
    ],
  },
  {
    icon: 'image-outline',
    color: '#EF4444',
    bg: '#FEF2F2',
    title: 'Cattle Images',
    content: [
      'Images you upload for cattle registration are stored securely on our servers.',
      'These images are used solely for cattle identification and verification purposes.',
      'Images are accessible to authorized verifiers and system administrators only.',
      'We do not use your cattle images for any commercial or advertising purpose.',
    ],
  },
  {
    icon: 'phone-portrait-outline',
    color: '#06B6D4',
    bg: '#ECFEFF',
    title: 'Your Rights',
    content: [
      'You can view and update your personal information from the Settings screen.',
      'You can request deletion of your account by contacting our support team.',
      'You may opt out of non-essential communications at any time.',
      'You have the right to know what personal data we hold about you.',
    ],
  },
  {
    icon: 'refresh-outline',
    color: '#6B7280',
    bg: '#F9FAFB',
    title: 'Updates to This Policy',
    content: [
      'We may update this Privacy Policy from time to time.',
      'You will be notified of material changes via an in-app notification.',
      'Continued use of the App after updates constitutes acceptance of the revised policy.',
      'The "Last Updated" date at the top of this page reflects the most recent revision.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: '#1E40AF' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#1E40AF' }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#F9FAFB' }}>
          {/* Header */}
          <View className="px-5 pt-4 pb-20" style={{ backgroundColor: '#1E40AF' }}>
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3">
              <Ionicons name="arrow-back" size={22} color="white" />
              <Text className="text-white text-sm ml-2 font-medium">Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Privacy Policy</Text>
            <Text className="text-white/80 text-sm mt-1">Last updated: January 2025</Text>
          </View>

          <View className="px-4 -mt-10 pb-8">
            {/* Intro */}
            <View className="bg-white rounded-2xl p-4 shadow-md mb-4 flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="shield-checkmark-outline" size={20} color="#3B82F6" />
              </View>
              <Text className="text-gray-600 text-sm flex-1 leading-5">
                Your privacy matters to us. This policy explains what data we collect, how we use it and how we keep it safe. This App is developed and maintained by IIT BHU.
              </Text>
            </View>

            {/* Sections */}
            {sections.map((section, i) => (
              <View key={i} className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
                {/* Section header */}
                <View className="flex-row items-center px-4 py-4 border-b border-gray-50">
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: section.bg }}
                  >
                    <Ionicons name={section.icon as any} size={18} color={section.color} />
                  </View>
                  <Text className="text-gray-900 font-bold text-sm flex-1">{section.title}</Text>
                </View>
                {/* Section content */}
                <View className="px-4 py-3">
                  {section.content.map((point, j) => (
                    <View key={j} className="flex-row mb-2 items-start">
                      <View
                        className="w-1.5 h-1.5 rounded-full mt-2 mr-3"
                        style={{ backgroundColor: section.color }}
                      />
                      <Text className="text-gray-600 text-sm leading-5 flex-1">{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Footer */}
            <View className="bg-blue-50 rounded-2xl p-4 mt-2">
              <Text className="text-blue-800 font-bold text-sm text-center mb-1">Questions?</Text>
              <Text className="text-blue-600 text-xs text-center leading-5">
                Contact us at{' '}
                <Text className="font-semibold">support@cattleidentification.com</Text>
                {'\n'}We are committed to protecting your privacy.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

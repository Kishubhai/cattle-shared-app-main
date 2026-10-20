import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By downloading, installing or using the Cattle Identification app ("App"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the App. These terms apply to all users including farmers (registered owners) and administrators.',
  },
  {
    title: '2. User Eligibility',
    content:
      'You must be at least 18 years of age and a legitimate cattle owner or authorized representative to register an account. You are responsible for providing accurate and truthful information during registration.',
  },
  {
    title: '3. Account Responsibilities',
    content:
      'You are solely responsible for maintaining the confidentiality of your login credentials. You must notify us immediately of any unauthorized access to your account. We are not liable for any loss resulting from unauthorized use of your account.',
  },
  {
    title: '4. Cattle Registration',
    content:
      'You may only register cattle that you legally own or are authorized to register. Submitting false, misleading or duplicate records is strictly prohibited and may result in immediate account suspension. All submissions are subject to verification by our authorized team.',
  },
  {
    title: '5. Image Submission Guidelines',
    content:
      'Images submitted for cattle registration must be genuine, unaltered photos of the actual animal. Images must not include a face rope or nose rope on the cattle. Submitting manipulated or fraudulent images is a violation of these terms and may have legal consequences.',
  },
  {
    title: '6. Verification & Decisions',
    content:
      'All submitted cattle records are reviewed by our verification team within 48 hours. The decision to approve or decline a registration is at the sole discretion of the authorized verifiers. Declined registrations cannot be re-submitted with the same animal without valid justification.',
  },
  {
    title: '7. Ownership Transfers',
    content:
      'The "Sell / Transfer" feature facilitates ownership transfer requests. Both parties must have valid accounts. We do not guarantee the completion of any transfer and are not responsible for disputes arising between users.',
  },
  {
    title: '8. Prohibited Activities',
    content:
      'You must not: (a) register cattle you do not own, (b) create multiple accounts for the same person, (c) attempt to reverse-engineer or misuse the App, (d) upload offensive or irrelevant content, or (e) use the App for any unlawful purpose.',
  },
  {
    title: '9. Limitation of Liability',
    content:
      'The App is provided "as is" without any warranties. We are not liable for any direct, indirect or consequential damages arising from the use or inability to use the App, including data loss or service interruptions.',
  },
  {
    title: '10. Changes to Terms',
    content:
      'We reserve the right to update these Terms at any time. Continued use of the App after changes are posted constitutes your acceptance of the revised Terms. We will notify users of significant changes via in-app notification.',
  },
  {
    title: '11. Governing Law',
    content:
      'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Varanasi, Uttar Pradesh, India.',
  },
];

export default function TermsScreen() {
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
            <Text className="text-white text-2xl font-bold">Terms & Conditions</Text>
            <Text className="text-white/80 text-sm mt-1">Last updated: January 2025</Text>
          </View>

          <View className="px-4 -mt-10 pb-8">
            {/* Intro */}
            <View className="bg-white rounded-2xl p-4 shadow-md mb-4 flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
              </View>
              <Text className="text-gray-600 text-sm flex-1 leading-5">
                Please read these Terms and Conditions carefully before using the Cattle Identification app developed by IIT BHU.
              </Text>
            </View>

            {/* Sections */}
            <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              {sections.map((section, i) => (
                <View key={i}>
                  {i > 0 && <View className="h-px bg-gray-100 mx-4" />}
                  <View className="px-4 py-4">
                    <Text className="text-gray-900 font-bold text-sm mb-2">{section.title}</Text>
                    <Text className="text-gray-600 text-sm leading-6">{section.content}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Footer */}
            <View className="bg-blue-50 rounded-2xl p-4 items-center">
              <Text className="text-blue-700 text-xs font-semibold text-center">
                By using this app you confirm that you have read, understood and agree to these Terms & Conditions.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

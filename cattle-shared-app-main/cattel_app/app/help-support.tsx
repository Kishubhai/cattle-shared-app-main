import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const faqs = [
  {
    q: 'How long does cattle verification take?',
    a: 'Verification is typically completed within 48 hours of submission. You will receive a notification once it is done.',
  },
  {
    q: 'Why was my cattle registration declined?',
    a: 'Registrations are declined if the cattle is already registered in the system (duplicate) or if the submitted images do not meet the required quality standards.',
  },
  {
    q: 'How many images are required to register cattle?',
    a: 'A total of 12 images are required: 5 Muzzle, 5 Face, 1 Full body left and 1 Full body right.',
  },
  {
    q: 'Can I update my cattle information after submission?',
    a: 'Once submitted for verification, cattle details cannot be edited. If there is an error, please contact support.',
  },
  {
    q: 'What is an Archive?',
    a: 'Archiving a cattle record moves it to the recycle bin. Archived cattle are no longer active in the identification system.',
  },
  {
    q: 'How do I transfer ownership of my cattle?',
    a: 'Open the cattle\'s detail page and tap "Sell". This initiates a transfer request to the new owner.',
  },
  {
    q: 'I forgot my password. What should I do?',
    a: 'On the login screen, tap "Forgot Password", enter your registered mobile number, and follow the OTP-based reset flow.',
  },
];

export default function HelpSupportScreen() {
  const [expanded, setExpanded] = React.useState<number | null>(null);

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
            <Text className="text-white text-2xl font-bold">Help & Support</Text>
            <Text className="text-white/80 text-sm mt-1">We're here to help you</Text>
          </View>

          <View className="px-4 -mt-10 pb-8">
            {/* Contact Card */}
            <View className="bg-white rounded-2xl shadow-md overflow-hidden mb-4">
              <View className="px-4 py-3 border-b border-gray-100">
                <Text className="text-xs font-bold text-gray-500 uppercase">Contact Us</Text>
              </View>

              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                activeOpacity={0.7}
                onPress={() => Linking.openURL('mailto:support@cattleidentification.com')}
              >
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Ionicons name="mail-outline" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">Email Support</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">support@cattleidentification.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <View className="h-px bg-gray-100 mx-4" />

              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                activeOpacity={0.7}
                onPress={() =>
                  Toast.show({ type: 'info', text1: 'Support Hours', text2: 'Mon–Sat, 9 AM – 6 PM IST' })
                }
              >
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                  <Ionicons name="time-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">Support Hours</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">Mon – Sat, 9 AM – 6 PM IST</Text>
                </View>
              </TouchableOpacity>

              <View className="h-px bg-gray-100 mx-4" />

              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                activeOpacity={0.7}
                onPress={() => router.push('/instructions' as any)}
              >
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <Ionicons name="book-outline" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">View Instructions</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">Step-by-step guide for using the app</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* FAQ */}
            <Text className="text-xs font-bold text-gray-500 uppercase mb-3 ml-1">
              Frequently Asked Questions
            </Text>

            <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
              {faqs.map((faq, i) => (
                <View key={i}>
                  {i > 0 && <View className="h-px bg-gray-100 mx-4" />}
                  <TouchableOpacity
                    onPress={() => setExpanded(expanded === i ? null : i)}
                    activeOpacity={0.7}
                    className="px-4 py-4"
                  >
                    <View className="flex-row items-start">
                      <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-3 mt-0.5">
                        <Text className="text-blue-700 text-xs font-bold">Q</Text>
                      </View>
                      <Text className="text-gray-900 font-semibold text-sm flex-1 leading-5">
                        {faq.q}
                      </Text>
                      <Ionicons
                        name={expanded === i ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9CA3AF"
                        style={{ marginLeft: 8 }}
                      />
                    </View>

                    {expanded === i && (
                      <View className="flex-row mt-3 ml-9">
                        <Text className="text-gray-600 text-sm leading-5 flex-1">{faq.a}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Developed by */}
            <View className="bg-blue-50 rounded-2xl p-4 items-center">
              <Ionicons name="school-outline" size={24} color="#3B82F6" />
              <Text className="text-blue-800 font-bold text-sm mt-2">Developed by IIT BHU</Text>
              <Text className="text-blue-600 text-xs mt-1 text-center">
                Cattle Identification System — Securing livestock records digitally.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

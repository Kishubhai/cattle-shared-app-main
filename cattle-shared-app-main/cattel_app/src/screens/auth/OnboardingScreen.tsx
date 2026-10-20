import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, Pressable, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to Cattle ID',
    description: 'Smart cattle identification and management system powered by advanced technology',
    icon: '🐄',
    color: '#3B82F6',
  },
  {
    id: '2',
    title: 'Register & Track',
    description: 'Easily register your cattle with photos and track all important information in one place',
    icon: '📸',
    color: '#10B981',
  },
  {
    id: '3',
    title: 'Secure & Verified',
    description: 'Admin-verified registration ensures authenticity and helps prevent fraud',
    icon: '✅',
    color: '#8B5CF6',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0]?.index || 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push('/login');
    }
  };

  const OnboardingItem = ({ item }: { item: typeof slides[0] }) => {
    return (
      <View style={{ width, height: height * 0.75 }} className="items-center justify-center px-8">
        {/* Icon Container */}
        <View className="mb-12">
          <View 
            className="w-32 h-32 rounded-full items-center justify-center bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text className="text-7xl">{item.icon}</Text>
          </View>
        </View>

        {/* Content */}
        <View className="items-center px-4">
          <Text className="text-3xl font-bold text-gray-900 text-center mb-4">
            {item.title}
          </Text>
          <Text className="text-base text-gray-600 text-center leading-6 max-w-sm">
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const Paginator = () => {
    return (
      <View className="flex-row h-12 items-center justify-center">
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={i.toString()}
              className="h-2 rounded-full bg-blue-600 mx-1"
              style={{ width: dotWidth, opacity }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip Button */}
      {currentIndex !== slides.length - 1 && (
        <View className="absolute top-4 right-6 z-10">
          <Pressable onPress={() => router.push('/login')}>
            <Text className="text-gray-500 text-base font-medium">Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Slides */}
      <View className="flex-1">
        <FlatList
          data={slides}
          renderItem={({ item }) => <OnboardingItem item={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      {/* Bottom Section */}
      <View className="px-6 pb-8">
        <Paginator />
        
        {/* Next/Get Started Button */}
        <Pressable
          onPress={scrollTo}
          className="bg-blue-600 py-4 rounded-xl items-center mt-6 active:bg-blue-700"
          style={{
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-white text-lg font-semibold">
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>

        {/* Login Link */}
        {currentIndex === slides.length - 1 && (
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-600">Already have an account? </Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text className="text-blue-600 font-semibold">Login</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
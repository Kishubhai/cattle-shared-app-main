import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '../../config/theme';
import { getToken } from '../../utils/storage';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Check authentication and navigate
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setTimeout(async () => {
      const token = await getToken();
      if (token) {
        // Navigate to main app (we'll create this later)
        router.replace('/login');
      } else {
        router.replace('/onboarding');
      }
    }, 2500);
  };

  return (
    <LinearGradient
      colors={[theme.colors.primary[600], theme.colors.primary[800]]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🐄</Text>
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>Cattle ID</Text>
        <Text style={styles.tagline}>Smart Cattle Identification System</Text>

        {/* Loading Indicator */}
        <Animated.View style={[styles.loader, { opacity: fadeAnim }]}>
          <View style={styles.loaderDot} />
          <View style={[styles.loaderDot, styles.loaderDotDelay1]} />
          <View style={[styles.loaderDot, styles.loaderDotDelay2]} />
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
        Powered by IIT BHU
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoEmoji: {
    fontSize: 60,
  },
  appName: {
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  loader: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 5,
  },
  loaderDotDelay1: {
    opacity: 0.7,
  },
  loaderDotDelay2: {
    opacity: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
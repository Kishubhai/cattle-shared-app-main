import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ─── Floating Particle ────────────────────────────────────────────────────────
function Particle({
  x, y, size, delay, color,
}: {
  x: number; y: number; size: number; delay: number; color: string;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -20,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Main Splash Screen ───────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();

  // Master fade out
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Logo circle
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-30)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;

  // Cattle icon
  const cattleRotateY = useRef(new Animated.Value(0)).current;
  const cattleBob = useRef(new Animated.Value(0)).current;
  const cattleScale = useRef(new Animated.Value(0)).current;

  // Rings
  const ring1Scale = useRef(new Animated.Value(0.4)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.4)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.4)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // Text
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const pillsOpacity = useRef(new Animated.Value(0)).current;

  // Progress bar (non-native driver — animates width)
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  const navigateToLogin = () => {
    router.replace('/login');
  };

  useEffect(() => {
    // ── 1. Rings pulse in ─────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(ring1Opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.spring(ring1Scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(ring2Opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.spring(ring2Scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(ring3Opacity, { toValue: 0.12, duration: 600, useNativeDriver: true }),
        Animated.spring(ring3Scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 2. Glow expands ───────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1, friction: 8, tension: 30, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 3. Logo circle springs in ─────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.spring(logoRotate, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 4. Cattle pops in ─────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(600),
      Animated.spring(cattleScale, { toValue: 1, friction: 3, tension: 50, useNativeDriver: true }),
    ]).start();

    // ── 5. Cattle 3D flip (scaleX oscillation, 2 cycles) ─────────────────────
    Animated.sequence([
      Animated.delay(900),
      Animated.loop(
        Animated.sequence([
          Animated.timing(cattleRotateY, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(cattleRotateY, {
            toValue: -1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(cattleRotateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]).start();

    // ── 6. Cattle gentle bob (infinite) ──────────────────────────────────────
    Animated.sequence([
      Animated.delay(800),
      Animated.loop(
        Animated.sequence([
          Animated.timing(cattleBob, {
            toValue: -12,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(cattleBob, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // ── 7. Title slides up ────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 8. Tagline appears ────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(taglineTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 9. Pills fade in ──────────────────────────────────────────────────────
    Animated.sequence([
      Animated.delay(1600),
      Animated.timing(pillsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // ── 10. Progress bar fills over 5s (non-native: animates width) ───────────
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(progressOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(progressWidth, {
          toValue: width - 80,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // ── 11. After 5s fade out → navigate ─────────────────────────────────────
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) navigateToLogin();
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // ── Derived interpolations ────────────────────────────────────────────────
  const logoRotateDeg = logoRotate.interpolate({
    inputRange: [-30, 0],
    outputRange: ['-30deg', '0deg'],
  });

  const cattleScaleX = cattleRotateY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.2, 1, 0.2],
  });

  // ── Particle positions ────────────────────────────────────────────────────
  const particles = [
    { x: 30,           y: 120,          size: 8,  delay: 200, color: 'rgba(74,222,128,0.6)' },
    { x: width - 50,  y: 160,          size: 6,  delay: 400, color: 'rgba(167,243,208,0.5)' },
    { x: 60,           y: height * 0.6, size: 10, delay: 600, color: 'rgba(110,231,183,0.4)' },
    { x: width - 80,  y: height * 0.55,size: 7,  delay: 300, color: 'rgba(52,211,153,0.5)' },
    { x: width * 0.2, y: 80,           size: 5,  delay: 700, color: 'rgba(209,250,229,0.6)' },
    { x: width * 0.75,y: 220,          size: 9,  delay: 500, color: 'rgba(74,222,128,0.3)' },
    { x: 20,           y: height * 0.35,size: 6, delay: 800, color: 'rgba(167,243,208,0.4)' },
    { x: width - 30,  y: height * 0.4, size: 11, delay: 150, color: 'rgba(52,211,153,0.3)' },
    { x: width * 0.5, y: 50,           size: 7,  delay: 900, color: 'rgba(110,231,183,0.5)' },
    { x: width * 0.1, y: height * 0.75,size: 5,  delay: 350, color: 'rgba(74,222,128,0.4)' },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Background gradient ──────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0a1628', '#0d2818', '#0a2e1a', '#061510']}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Radial glow overlay ──────────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(16,185,129,0.15)', 'transparent']}
        style={[StyleSheet.absoluteFillObject, { borderRadius: width }]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* ── Floating particles ───────────────────────────────────────────────── */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* ── Main centred content ─────────────────────────────────────────────── */}
      <View style={styles.center}>
        {/* Expanding rings */}
        <Animated.View style={[styles.ring, styles.ring3, { opacity: ring3Opacity, transform: [{ scale: ring3Scale }] }]} />
        <Animated.View style={[styles.ring, styles.ring2, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
        <Animated.View style={[styles.ring, styles.ring1, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

        {/* Glow halo */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

        {/* Logo circle */}
        <Animated.View
          style={[
            styles.logoCircle,
            { transform: [{ scale: logoScale }, { rotate: logoRotateDeg }] },
          ]}
        >
          <LinearGradient
            colors={['#10b981', '#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: cattleScale },
                  { translateY: cattleBob },
                  { scaleX: cattleScaleX },
                ],
              }}
            >
              <Text style={styles.cattleEmoji}>🐄</Text>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* Shine sweep */}
        <Animated.View
          style={[
            styles.shineLine,
            { transform: [{ scale: logoScale }, { rotate: logoRotateDeg }] },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* ── Text block ───────────────────────────────────────────────────────── */}
      <View style={styles.textBlock}>
        <Animated.View
          style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}
        >
          <Text style={styles.appName}>CattleTag</Text>
          <LinearGradient
            colors={['#10b981', '#34d399', '#6ee7b7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] },
          ]}
        >
          Smart Cattle Identification &amp; Management
        </Animated.Text>

        <Animated.View style={[styles.pillsRow, { opacity: pillsOpacity }]}>
          {['🏷️ Track', '📍 Locate', '✅ Verify'].map((label) => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth, opacity: progressOpacity }]}
          >
            <LinearGradient
              colors={['#10b981', '#34d399', '#6ee7b7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressLabel}>Loading...</Text>
      </View>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <Text style={styles.footer}>© 2024 CattleTag · Govt. of India Initiative</Text>
    </Animated.View>
  );
}

const RING_BASE = 200;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },

  // Rings
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  ring1: { width: RING_BASE,       height: RING_BASE },
  ring2: { width: RING_BASE + 70,  height: RING_BASE + 70 },
  ring3: { width: RING_BASE + 140, height: RING_BASE + 140 },

  // Glow halo
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16,185,129,0.18)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },

  // Logo circle
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 80,
  },
  cattleEmoji: {
    fontSize: 72,
    lineHeight: 80,
    textAlign: 'center',
  },

  // Shine line
  shineLine: {
    position: 'absolute',
    width: 40,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    transform: [{ rotate: '30deg' }, { translateX: -30 }],
  },

  // Text
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(16,185,129,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  accentLine: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 16,
    width: '60%',
    alignSelf: 'center',
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(209,250,229,0.85)',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.5)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 40,
    marginBottom: 24,
    alignItems: 'center',
  },
  progressTrack: {
    width: width - 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    color: 'rgba(209,250,229,0.5)',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    marginBottom: 28,
    letterSpacing: 0.5,
  },
});

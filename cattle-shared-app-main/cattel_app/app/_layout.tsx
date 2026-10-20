// ============================================================
// SIMPLIFIED ROOT LAYOUT - NO AUTO-NAVIGATION
// File: app/_layout.tsx
// REPLACE YOUR ENTIRE app/_layout.tsx WITH THIS
// ============================================================

import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import '../global.css';


export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Welcome/Landing */}
        <Stack.Screen name="index" />
        
        {/* Public Auth Screens */}
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="register-admin" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="onboarding" />
        
        {/* Profile/Settings Screens */}
        <Stack.Screen name="change-password" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="profile-details" />

        {/* App Info Screens */}
        <Stack.Screen name="instructions" />
        <Stack.Screen name="help-support" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy-policy" />
        
        {/* Modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        
        {/* User Section (Farmer) */}
        <Stack.Screen name="(user)" />

        {/* Regional Admin Section */}
        <Stack.Screen name="(regional-admin)" />
        
        {/* Super Admin Section */}
        <Stack.Screen name="(super-admin)" />
      </Stack>

      {/* Toast Notifications */}
      <Toast />
    </>
  );
}
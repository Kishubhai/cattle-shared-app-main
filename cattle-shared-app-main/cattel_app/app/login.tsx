import { useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from '../src/screens/auth/LoginScreen';

export default function Login() {
  const rootNavigationState = useRootNavigationState();

  // Wait for navigation to be fully ready
  if (!rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <LoginScreen />;
}
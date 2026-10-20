import { useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import ForgotPasswordScreen from '../src/screens/auth/ForgotPasswordScreen';

export default function ForgotPassword() {
  const rootNavigationState = useRootNavigationState();

  if (!rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <ForgotPasswordScreen />;
}
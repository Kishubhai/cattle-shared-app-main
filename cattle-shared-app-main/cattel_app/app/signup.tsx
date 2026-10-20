import { useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import SignupScreen from '../src/screens/auth/SignupScreen';

export default function Signup() {
  const rootNavigationState = useRootNavigationState();

  if (!rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <SignupScreen />;
}
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';

// Normally the Google sign-in flow (lib/googleAuth.ts) captures the
// redirect directly inside the WebBrowser session and never actually
// navigates here. This route exists as a fallback for platforms/cases
// where the OS also fires the deep link at the app router — by the time
// that happens, app/_layout.tsx's onAuthStateChange listener has usually
// already picked up the new session, so this just bounces back to Home.
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/(tabs)'), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white }}>
      <ActivityIndicator color={COLORS.accent} />
    </View>
  );
}

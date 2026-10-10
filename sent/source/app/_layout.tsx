import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { ToastProvider } from '../context/ToastContext';
import { NetworkProvider } from '../context/NetworkContext';
import { OfflineSyncManager } from '../components/OfflineSyncManager';

// Password-recovery and signup-confirmation emails deep-link back in as
// sent://auth-callback#access_token=...&type=signup (or
// sent://reset-password#...&type=recovery) — Supabase puts the tokens
// in the URL fragment, same as the Google OAuth redirect (see
// lib/googleAuth.ts), so we parse it the same way rather than relying on
// `detectSessionInUrl` (a web-only feature, off in lib/supabase.ts).
//
// A link that's already been used or has expired arrives with an `error`
// param instead of tokens (e.g. otp_expired when an email client
// "pre-clicks" links to scan them, burning the one-time token before the
// user taps it) — surfaced directly rather than failing silently.
async function handleAuthDeepLink(url: string, router: ReturnType<typeof useRouter>) {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);

  const errorDescription = params.get('error_description');
  if (errorDescription) {
    Alert.alert('That link didn\'t work', `${errorDescription.replace(/\+/g, ' ')} — request a new one and open it right away.`);
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;

  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (params.get('type') === 'recovery') router.replace('/reset-password');
  // Any other type (signup confirmation, magic link, etc.) just needs the
  // session established — useProtectedRoute picks it up and routes to (tabs).
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Cached data is shown immediately even if it's offline-stale —
      // that's the point of persisting it. Refetch happens in the
      // background once connectivity is confirmed.
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Persists the query cache to AsyncStorage so sessions/climbs/etc are
// still visible on next launch even with zero connectivity — this is
// separate from the offline *write* queue (lib/offlineQueue.ts), which
// handles writes made while offline.
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'sent-query-cache',
});

function useProtectedRoute(authSession: Session | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'auth-callback' || segments[0] === 'reset-password';

    if (!authSession && !inAuthGroup) {
      router.replace('/login');
    } else if (authSession && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [authSession, loading, segments]);
}

export default function RootLayout() {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuthSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url, router);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url, router));
    return () => sub.remove();
  }, []);

  useProtectedRoute(authSession, loading);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <SafeAreaProvider>
          <NetworkProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <OfflineSyncManager />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="gym-picker" options={{ presentation: 'modal' }} />
                <Stack.Screen name="qr-invite" options={{ presentation: 'modal' }} />
                <Stack.Screen name="add-friend" options={{ presentation: 'modal' }} />
                <Stack.Screen name="logging" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="share" options={{ presentation: 'card' }} />
                <Stack.Screen name="all-sessions" options={{ presentation: 'card' }} />
                <Stack.Screen name="projects" options={{ presentation: 'card' }} />
                <Stack.Screen name="friend/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="account-settings" options={{ presentation: 'card' }} />
                <Stack.Screen name="session/[id]" options={{ presentation: 'card' }} />
              </Stack>
            </ToastProvider>
          </NetworkProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

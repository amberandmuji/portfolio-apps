import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { COLORS, RADIUS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { useToast } from '../context/ToastContext';

// Some native UI components (like the Apple Sign In button) aren't part of
// what Expo Go ships — they only work in a real development/production
// build. Rendering them in Expo Go crashes with an "Unimplemented
// component" error, so we detect Expo Go and hide the button there instead.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function LoginScreen() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  async function handleSubmit() {
    setError(null);

    if (mode === 'signUp') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
      }
    }

    setLoading(true);
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
    else if (mode === 'signUp' && !data.session) {
      // Only happens if "Confirm email" is still enabled in the Supabase dashboard.
      setError('Email confirmation is still turned on for this project. Disable "Confirm email" in Supabase → Authentication → Providers → Email.');
    }
    // On success, app/_layout.tsx's auth listener redirects to (tabs) automatically.
  }

  async function handleForgotPassword() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?"');
      return;
    }
    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setResetLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    showToast('Check your email for a reset link');
  }

  async function handleApple() {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('No identity token returned from Apple');

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (authError) throw authError;
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return; // user dismissed the Apple sheet
      setError(e.message ?? 'Apple sign-in failed');
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGuest() {
    setError(null);
    setGuestLoading(true);
    const { error: authError } = await supabase.auth.signInAnonymously();
    setGuestLoading(false);
    if (authError) setError(authError.message);
    // On success, the auth listener redirects automatically, same as any other sign-in.
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Sent</Text>
      <Text style={styles.subtitle}>{mode === 'signIn' ? 'Sign in to continue' : 'Create your account'}</Text>

      {Platform.OS === 'ios' && !isExpoGo && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={RADIUS.control}
          style={styles.appleButton}
          onPress={handleApple}
        />
      )}
      {Platform.OS === 'ios' && isExpoGo && (
        <Text style={styles.expoGoNote}>Apple Sign In is available in the full app build, not in Expo Go.</Text>
      )}

      <SecondaryButton label="Continue with Google" onPress={handleGoogle} loading={googleLoading} style={styles.googleButton} />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.sub}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={COLORS.sub}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {mode === 'signUp' && (
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={COLORS.sub}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      )}

      {mode === 'signIn' && (
        <Pressable onPress={handleForgotPassword} disabled={resetLoading} hitSlop={4}>
          <Text style={styles.forgotPasswordText}>{resetLoading ? 'Sending...' : 'Forgot password?'}</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        label={mode === 'signIn' ? 'Sign in' : 'Sign up'}
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: 8 }}
      />

      <Pressable
        onPress={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setConfirmPassword('');
          setError(null);
        }}
      >
        <Text style={styles.switchModeText}>
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={handleGuest} disabled={guestLoading} style={styles.guestButton}>
        <Text style={styles.guestButtonText}>{guestLoading ? 'Continuing...' : 'Continue as guest'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '600', color: COLORS.ink, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.sub, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  appleButton: { height: 48, marginBottom: 10 },
  expoGoNote: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginBottom: 14 },
  googleButton: { marginBottom: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 14, color: COLORS.sub },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.control,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 17,
    color: COLORS.ink,
  },
  forgotPasswordText: { color: COLORS.accentDark, fontSize: 14, fontWeight: '500', textAlign: 'right', marginBottom: 12 },
  error: { color: COLORS.danger, fontSize: 15, marginBottom: 12 },
  switchModeText: { color: COLORS.accentDark, fontSize: 15, textAlign: 'center', marginTop: 18 },
  guestButton: { marginTop: 24, alignItems: 'center' },
  guestButtonText: { color: COLORS.sub, fontSize: 15, fontWeight: '500', textDecorationLine: 'underline' },
});

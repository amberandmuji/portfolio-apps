import { useState } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/Buttons';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

// Reached via the sent://reset-password deep link from a password
// recovery email — app/_layout.tsx's linking listener exchanges the
// recovery token for a session before routing here, so by the time this
// screen renders the user is already authenticated and updateUser just
// works.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    showToast('Password updated');
    router.replace('/(tabs)');
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>Choose a new password for your account.</Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor={COLORS.sub}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        placeholderTextColor={COLORS.sub}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton label="Update password" onPress={handleSubmit} loading={loading} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '600', color: COLORS.ink, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.sub, textAlign: 'center', marginBottom: 24 },
  input: { height: 48, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 14, marginBottom: 12, fontSize: 17, color: COLORS.ink },
  error: { color: COLORS.danger, fontSize: 15, marginBottom: 12 },
  button: { marginTop: 8 },
});

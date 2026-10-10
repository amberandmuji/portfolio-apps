import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { PrimaryButton } from './Buttons';
import { AnimatedSheet } from './AnimatedSheet';

interface Props {
  visible: boolean;
  reason: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Upgrades the current anonymous ("guest") session in place, rather than
// creating a brand-new account — supabase.auth.updateUser() attaches
// email/password to the SAME user id, so every session/climb/friendship
// already tied to that id carries over instead of being orphaned.
export function SignUpSheet({ visible, reason, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const { data, error: updateError } = await supabase.auth.updateUser({ email: email.trim(), password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    // The auto-create-profile trigger only fires on new-user insert, not
    // on this kind of update, so the profiles row still has a null email
    // unless we set it explicitly here.
    if (data.user) {
      await supabase.from('profiles').update({ email: email.trim() }).eq('id', data.user.id);
    }
    await queryClient.invalidateQueries({ queryKey: ['is-guest'] });
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    setLoading(false);
    reset();
    onSuccess();
  }

  return (
    <AnimatedSheet visible={visible} onClose={handleClose} maxWidth={380}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Create your account</Text>
        <Pressable onPress={handleClose} hitSlop={11}>
          <X size={18} color={COLORS.sub} />
        </Pressable>
      </View>
      <Text style={styles.reason}>{reason}</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={COLORS.sub}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={COLORS.sub}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor={COLORS.sub}
        secureTextEntry
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton label="Create account" onPress={handleSubmit} loading={loading} style={styles.submitButton} />
      <Pressable onPress={handleClose}>
        <Text style={styles.cancelText}>Not now</Text>
      </Pressable>
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { ...TYPE.sheetTitle, color: COLORS.ink },
  reason: { fontSize: 14, color: COLORS.sub, marginBottom: 16, lineHeight: 19 },
  input: { height: 48, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 14, marginBottom: 12, fontSize: 16, color: COLORS.ink },
  error: { color: COLORS.danger, fontSize: 14, marginBottom: 12 },
  submitButton: { marginBottom: 10 },
  cancelText: { fontSize: 14, color: COLORS.sub, textAlign: 'center' },
});

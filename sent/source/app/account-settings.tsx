import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { useProfile, useDeleteAccount } from '../hooks/useProfile';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const deleteAccount = useDeleteAccount();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (e: any) {
      setConfirmOpen(false);
      showToast(e.message ?? 'Something went wrong');
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
          <ArrowLeft size={14} color={COLORS.sub} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Account</Text>

        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{profile?.email ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{profile?.display_name ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.dangerZone}>
          <Pressable onPress={() => setConfirmOpen(true)} hitSlop={11}>
            <Text style={styles.deleteLink}>Delete account</Text>
          </Pressable>
          <Text style={styles.deleteHint}>Permanently deletes your sessions, climbs, and friend connections. This can't be undone.</Text>
        </View>
      </View>

      <ConfirmSheet
        visible={confirmOpen}
        title="Delete your account?"
        body="This permanently deletes all your sessions, climbs, gyms, and friend connections. This can't be undone."
        confirmLabel="Delete account"
        requireTypedConfirmation="DELETE"
        haptic="warning"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink, marginBottom: 20 },
  infoGroup: { backgroundColor: COLORS.bg, borderRadius: RADIUS.card, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  infoLabel: { fontSize: 16, color: COLORS.ink },
  infoValue: { fontSize: 15, color: COLORS.sub, flexShrink: 1 },
  dangerZone: { marginTop: 40, alignItems: 'center' },
  deleteLink: { fontSize: 15, fontWeight: '500', color: COLORS.danger, marginBottom: 6 },
  deleteHint: { fontSize: 13, color: COLORS.sub, textAlign: 'center', paddingHorizontal: 24 },
});

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, UserPlus } from 'lucide-react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/Buttons';
import { useFindUserById, useSendFriendRequestById } from '../hooks/useFriends';
import { useToast } from '../context/ToastContext';

export default function AddFriendScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { data: target, isLoading, error } = useFindUserById(uid);
  const sendRequest = useSendFriendRequestById();
  const { showToast } = useToast();
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleAdd() {
    if (!uid) return;
    setSendError(null);
    try {
      await sendRequest.mutateAsync(uid);
      setSent(true);
      showToast('Friend request sent');
    } catch (e: any) {
      setSendError(e.message ?? 'Something went wrong');
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.headerRow}>
        <View />
        <Pressable onPress={() => router.back()} hitSlop={11}>
          <X size={22} color={COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {isLoading && <ActivityIndicator color={COLORS.accent} />}

        {!isLoading && (error || !target) && (
          <Text style={styles.errorText}>This invite link isn't valid, or that climber can't be found.</Text>
        )}

        {!isLoading && target && (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{target.display_name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{target.display_name}</Text>

            {sent ? (
              <Text style={styles.sentText}>Request sent — you'll show up on their friends list once they accept.</Text>
            ) : (
              <>
                <Text style={styles.subtitle}>Add {target.display_name} as a friend on Sent?</Text>
                {sendError && <Text style={styles.errorText}>{sendError}</Text>}
                <PrimaryButton
                  label="Add friend"
                  icon={<UserPlus size={16} color="#FFFFFF" />}
                  onPress={handleAdd}
                  loading={sendRequest.isPending}
                  style={styles.addButton}
                />
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitial: { fontSize: 28, fontWeight: '600', color: COLORS.accentDark },
  name: { fontSize: 21, fontWeight: '600', color: COLORS.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.sub, textAlign: 'center', marginBottom: 24 },
  sentText: { fontSize: 15, color: COLORS.accentDark, textAlign: 'center' },
  errorText: { fontSize: 14, color: COLORS.danger, textAlign: 'center', marginBottom: 16 },
  addButton: { width: '100%' },
});

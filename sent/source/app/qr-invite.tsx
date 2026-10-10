import { View, Text, Pressable, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, RADIUS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { useProfile } from '../hooks/useProfile';
import { PrimaryButton } from '../components/Buttons';

export default function QRInviteScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  const inviteLink = profile ? `sent://add-friend?uid=${profile.id}` : '';

  async function handleShare() {
    if (!inviteLink) return;
    await Share.share({
      message: `Add me on Sent! ${inviteLink}`,
    });
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Invite friends</Text>
        <Pressable onPress={() => router.back()} hitSlop={11}>
          <X size={22} color={COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {isLoading || !profile ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : (
          <>
            <View style={styles.qrCard}>
              <QRCode value={inviteLink} size={220} color={COLORS.ink} backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.helperText}>Have a friend open their camera and scan this to add {profile.display_name} on Sent</Text>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <PrimaryButton label="Share invite link" icon={<Share2 size={16} color="#FFFFFF" />} onPress={handleShare} style={styles.shareButton} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  qrCard: { padding: 20, borderRadius: RADIUS.card, backgroundColor: '#FFFFFF', marginBottom: 20 },
  helperText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.sub },
  shareButton: { width: '100%' },
});

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE, CARD_SHADOW } from '../constants/theme';
import { Screen } from '../components/Screen';
import { useSessionById } from '../hooks/useSessions';
import { useSharePost } from '../hooks/useActivityFeed';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import type { Climb } from '../types/database';

export default function ShareScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const session = useSessionById(sessionId);
  const sharePost = useSharePost();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const sentClimbs = (session?.climbs ?? []).filter((c) => c.sent);

  async function handleShare() {
    if (pickedId) await sharePost.mutateAsync(pickedId);
    router.replace('/(tabs)/friends');
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Share a send?</Text>
      <Text style={styles.subtitle}>Pick one climb from today to share with friends</Text>

      {sentClimbs.length === 0 && <Text style={styles.emptyText}>No sends this session — nothing to share.</Text>}

      {sentClimbs.map((c: Climb) => {
        const selected = pickedId === c.id;
        return (
          <Pressable key={c.id} onPress={() => setPickedId(c.id)} style={[styles.climbRow, selected && styles.climbRowSelected]}>
            {c.photo_url ? <Image source={{ uri: c.photo_url }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: COLORS.border }]} />}
            <Text style={[styles.climbText, selected && { color: COLORS.accentDark }]}>
              {c.grade} · {c.attempts} attempt{c.attempts === 1 ? '' : 's'}
            </Text>
            {selected && <Check size={18} color={COLORS.accentDark} />}
          </Pressable>
        );
      })}

      <View style={styles.actionRow}>
        <SecondaryButton label="Skip" onPress={() => router.replace('/(tabs)')} style={{ flex: 1 }} />
        <PrimaryButton label="Share" onPress={handleShare} disabled={sentClimbs.length > 0 && !pickedId} style={{ flex: 1 }} />
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  title: { ...TYPE.pageTitle, color: COLORS.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', paddingVertical: 16 },
  climbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 10, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent', ...CARD_SHADOW },
  climbRowSelected: { borderColor: COLORS.accent },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  climbText: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.ink },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});

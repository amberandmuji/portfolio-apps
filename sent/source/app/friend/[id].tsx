import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useFriends, useLeaderboard, useRemoveFriend } from '../../hooks/useFriends';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Screen } from '../../components/Screen';
import { Avatar } from '../../components/Avatar';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: friends } = useFriends();
  const { data: leaderboard } = useLeaderboard();
  const removeFriend = useRemoveFriend();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const friendship = friends?.find((f) => f.other_user_id === id);
  const leaderboardEntry = leaderboard?.find((l) => l.user_id === id);

  if (!friendship) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.emptyText}>Friend not found.</Text>
      </Screen>
    );
  }

  async function handleRemove() {
    await removeFriend.mutateAsync(friendship!.friendship_id);
    setConfirmOpen(false);
    router.back();
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
        <ArrowLeft size={14} color={COLORS.sub} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarImageWrap}>
          <Avatar name={friendship.display_name} avatarUrl={friendship.avatar_url} size={64} />
        </View>
        <Text style={styles.name}>{friendship.display_name}</Text>
        <Text style={styles.subtitle}>Top grade {leaderboardEntry?.top_grade ?? '—'}</Text>
      </View>

      {/*
        NOTE: a real "this week" summary and "climbs shared" list for a
        friend requires either a broader RLS read policy on sessions/climbs
        for accepted friends, or another security-definer RPC (like
        get_leaderboard) that aggregates a friend's recent activity
        server-side. Not scaffolded yet — the activity feed on the Friends
        tab already shows their shared posts in the meantime.
      */}

      <Pressable onPress={() => setConfirmOpen(true)} style={styles.removeButton}>
        <Text style={styles.removeButtonText}>Remove friend</Text>
      </Pressable>

      <ConfirmSheet
        visible={confirmOpen}
        title={`Remove ${friendship.display_name}?`}
        body="They'll be removed from your leaderboard and friends list."
        confirmLabel="Remove friend"
        onConfirm={handleRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  avatarWrap: { alignItems: 'center', marginBottom: 30 },
  avatarImageWrap: { marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 2 },
  removeButton: { height: 44, borderRadius: RADIUS.control, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { fontSize: 15, fontWeight: '500', color: COLORS.danger },
  emptyText: { fontSize: 15, color: COLORS.sub, textAlign: 'center', padding: 20 },
});

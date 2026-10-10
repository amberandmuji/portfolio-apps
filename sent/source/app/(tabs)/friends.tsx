import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, QrCode, Heart, X } from 'lucide-react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../../constants/theme';
import { Screen } from '../../components/Screen';
import { useFriends, useLeaderboard, useSendFriendRequest, useAcceptFriendRequest } from '../../hooks/useFriends';
import { useIsGuest } from '../../hooks/useProfile';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { PhotoViewer } from '../../components/PhotoViewer';
import { SignUpSheet } from '../../components/SignUpSheet';
import { Avatar } from '../../components/Avatar';
import { AnimatedSheet } from '../../components/AnimatedSheet';
import { PrimaryButton } from '../../components/Buttons';
import { timeAgo } from '../../lib/sessionFormat';

function AddFriendModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const sendRequest = useSendFriendRequest();

  async function handleSend() {
    setError(null);
    try {
      await sendRequest.mutateAsync(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    }
  }

  function handleClose() {
    setEmail('');
    setError(null);
    setSent(false);
    onClose();
  }

  return (
    <AnimatedSheet visible={visible} onClose={handleClose} maxWidth={340}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add a friend</Text>
        <Pressable onPress={handleClose} hitSlop={8}><X size={18} color={COLORS.sub} /></Pressable>
      </View>
      {sent ? (
        <Text style={styles.sentText}>Friend request sent! They'll show up once they accept.</Text>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Their email address"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.emailInput}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <PrimaryButton label="Send request" onPress={handleSend} loading={sendRequest.isPending} disabled={!email.trim()} />
        </>
      )}
    </AnimatedSheet>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard();
  const { data: friends } = useFriends();
  const { data: activity, isLoading: loadingActivity } = useActivityFeed();
  const { data: isGuest } = useIsGuest();
  const acceptRequest = useAcceptFriendRequest();

  const incomingRequests = (friends ?? []).filter((f) => f.status === 'pending' && f.is_incoming);

  // Guests have no email (can't be found via useSendFriendRequest's email
  // lookup) and no way to recover the account later — gate both
  // add-friend entry points behind signing up first, rather than letting
  // them hit a confusing failure inside AddFriendModal/qr-invite.
  function requireAccount(action: () => void) {
    if (isGuest) setSignUpOpen(true);
    else action();
  }

  function toggleLiked(id: string) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Screen style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => requireAccount(() => router.push('/qr-invite'))} style={styles.addButton}>
            <QrCode size={17} color={COLORS.accentDark} />
          </Pressable>
          <Pressable onPress={() => requireAccount(() => setAddOpen(true))} style={styles.addButton}>
            <UserPlus size={17} color={COLORS.accentDark} />
          </Pressable>
        </View>
      </View>

      {incomingRequests.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionLabel}>Friend requests</Text>
          {incomingRequests.map((f) => (
            <View key={f.friendship_id} style={styles.requestRow}>
              <Avatar name={f.display_name} avatarUrl={f.avatar_url} size={28} />
              <Text style={styles.requestName}>{f.display_name}</Text>
              <Pressable onPress={() => acceptRequest.mutate(f.friendship_id)} style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>Leaderboard</Text>
      {loadingLeaderboard && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 12 }} />}
      {!loadingLeaderboard && (leaderboard ?? []).length <= 1 && (
        <Text style={styles.emptyText}>Add a friend to compare top grades.</Text>
      )}
      {(leaderboard ?? []).map((f, i) => (
        <Pressable
          key={f.user_id}
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: f.user_id } })}
          style={styles.leaderboardRow}
        >
          <Text style={[styles.rank, i === 0 && { color: COLORS.accentDark }]}>{i + 1}</Text>
          <Avatar name={f.display_name} avatarUrl={f.avatar_url} size={28} />
          <Text style={[styles.leaderboardName, i === 0 && { color: COLORS.accentDark }]}>{f.display_name}</Text>
          <Text style={[styles.leaderboardGrade, i === 0 && { color: COLORS.accentDark }]}>{f.top_grade ?? '—'}</Text>
        </Pressable>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Activity</Text>
      {loadingActivity && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 12 }} />}
      {(activity ?? []).length === 0 && !loadingActivity && <Text style={styles.emptyText}>No shared sends yet. Finish a session and share one.</Text>}
      {(activity ?? []).map((a) => (
        <View key={a.id} style={{ marginBottom: 14 }}>
          <View style={styles.activityHeader}>
            <Avatar name={a.display_name} avatarUrl={a.avatar_url} size={28} />
            <Text style={styles.activityText}>{a.display_name} sent a {a.grade} at {a.gym_name}</Text>
            <Text style={styles.activityTime}>{timeAgo(a.created_at)}</Text>
          </View>
          {a.photo_url && (
            <Pressable onPress={() => setViewerUri(a.photo_url)}>
              <Image source={{ uri: a.photo_url }} style={styles.activityPhoto} resizeMode="cover" />
            </Pressable>
          )}
          {a.photo_url && (
            <Pressable onPress={() => toggleLiked(a.id)} style={styles.likeButton} hitSlop={4}>
              <Heart size={22} color={likedIds.has(a.id) ? COLORS.danger : COLORS.sub} fill={likedIds.has(a.id) ? COLORS.danger : 'none'} />
            </Pressable>
          )}
        </View>
      ))}

      <AddFriendModal visible={addOpen} onClose={() => setAddOpen(false)} />
      <PhotoViewer visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
      <SignUpSheet
        visible={signUpOpen}
        reason="Sign up to add friends — guest accounts can't be found by email and can't be recovered later."
        onClose={() => setSignUpOpen(false)}
        onSuccess={() => setSignUpOpen(false)}
      />
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  addButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  emptyText: { fontSize: 15, color: COLORS.sub, paddingVertical: 8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 10, marginBottom: 8, ...CARD_SHADOW },
  requestName: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.ink },
  acceptButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 8, marginBottom: 6, ...CARD_SHADOW },
  rank: { fontSize: 16, fontWeight: '600', color: COLORS.ink, width: 16 },
  leaderboardName: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.ink },
  leaderboardGrade: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  activityText: { flex: 1, fontSize: 16, color: COLORS.ink },
  activityTime: { fontSize: 14, color: COLORS.sub },
  // Twitter/X caps single-photo posts at a 16:9 landscape ratio — full
  // card width, no fixed height, so tall or square uploads get cropped
  // consistently instead of the old fixed-110px squash.
  activityPhoto: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.card, marginBottom: 6, backgroundColor: COLORS.bg },
  // 44x44 minimum touch target (WCAG 2.5.5 / Apple HIG), even though the
  // heart icon itself is smaller — hitSlop alone won't grow the visible
  // hit area on the left edge of the row, so pad the button itself instead.
  likeButton: { width: 44, height: 44, marginLeft: -11, alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  emailInput: { height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 12, fontSize: 16, marginBottom: 10 },
  errorText: { fontSize: 14, color: COLORS.danger, marginBottom: 10 },
  sentText: { fontSize: 15, color: COLORS.accentDark, textAlign: 'center', paddingVertical: 12 },
});

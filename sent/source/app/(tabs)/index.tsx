import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Mountain, Link as RopeIcon } from 'lucide-react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../../constants/theme';
import { Screen } from '../../components/Screen';
import { useSessions, useDeleteClimb } from '../../hooks/useSessions';
import { useProfile } from '../../hooks/useProfile';
import { SwipeableRow } from '../../components/SwipeableRow';
import { StatCard } from '../../components/StatCard';
import { BigRow } from '../../components/BigRow';
import { SessionRow } from '../../components/SessionRow';
import { disciplineLabel, plural } from '../../lib/sessionFormat';
import { PhotoViewer } from '../../components/PhotoViewer';
import { BOULDER_GRADES } from '../../types/database';
import type { Session } from '../../types/database';

function DisciplineCard({ Icon, title, onPress }: { Icon: any; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.disciplineCard}>
      <View style={styles.disciplineIcon}>
        <Icon color={COLORS.accent} size={28} strokeWidth={2} />
      </View>
      <Text style={styles.disciplineTitle}>{title}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: sessions, isLoading } = useSessions();
  const { data: profile } = useProfile();
  const deleteClimb = useDeleteClimb();
  const displayName = profile?.display_name ?? 'Climber';
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const allSessions = sessions ?? [];
  const thisWeekCount = allSessions.filter((s) => Date.now() - new Date(s.started_at).getTime() < 7 * 24 * 3600 * 1000).length;

  const climbsWithSession = allSessions.flatMap((s) => (s.climbs ?? []).map((c) => ({ ...c, session: s })));
  const boulderSent = climbsWithSession.filter((c) => c.sent && c.session.discipline === 'boulder');
  const boulderGradeList: readonly string[] = BOULDER_GRADES;
  const topGrade = boulderSent.reduce((max: string, c) => (boulderGradeList.indexOf(c.grade) > boulderGradeList.indexOf(max) ? c.grade : max), 'V0');
  const topGradeSession = boulderSent
    .filter((c) => c.grade === topGrade)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.session;

  const allProjects = climbsWithSession
    .filter((c) => !c.sent)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const shownProjects = allProjects.slice(0, 3);

  const recentSessions = allSessions.slice(0, 5);

  return (
    <Screen style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeName}>{displayName}</Text>
        </View>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Start a session</Text>
      <View style={styles.disciplineRow}>
        <DisciplineCard Icon={Mountain} title="Bouldering" onPress={() => router.push({ pathname: '/gym-picker', params: { discipline: 'boulder' } })} />
        <DisciplineCard Icon={RopeIcon} title="Top Rope" onPress={() => router.push({ pathname: '/gym-picker', params: { discipline: 'rope' } })} />
      </View>

      <View style={styles.statsRow}>
        <StatCard value={thisWeekCount} label="This week" onPress={() => router.push('/(tabs)/review')} />
        <StatCard value={topGrade} label="Top grade" onPress={topGradeSession ? () => router.push({ pathname: '/session/[id]', params: { id: topGradeSession.id } }) : undefined} />
        <StatCard value={allProjects.length} label="Projects" onPress={allProjects.length > 0 ? () => router.push('/projects') : undefined} />
      </View>

      {shownProjects.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Project climbs</Text>
            {allProjects.length > 3 && (
              <Pressable onPress={() => router.push('/projects')} hitSlop={11}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 8 }}>
            {shownProjects.map((c) => (
              <SwipeableRow key={c.id} id={c.id} itemLabel="this project" onDelete={() => deleteClimb.mutate(c.id)}>
                <BigRow
                  Icon={c.session.discipline === 'rope' ? RopeIcon : Mountain}
                  title={disciplineLabel(c.session.discipline)}
                  bigText={c.grade}
                  metaTop={c.session.gym_name}
                  metaBottom={plural(c.attempts, 'attempt')}
                  photoUrl={c.photo_url}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: c.session.id } })}
                  onPhotoPress={c.photo_url ? () => setViewerUri(c.photo_url) : undefined}
                />
              </SwipeableRow>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Recent sessions</Text>
        {allSessions.length > 5 && (
          <Pressable onPress={() => router.push('/all-sessions')} hitSlop={11}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        )}
      </View>
      {isLoading && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 12 }} />}
      {!isLoading && recentSessions.length === 0 && <Text style={styles.emptyText}>No sessions yet. Pick Bouldering or Top Rope above to log your first.</Text>}
      <View style={{ gap: 8 }}>
        {recentSessions.map((s: Session) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </View>
    </ScrollView>
    <PhotoViewer visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeName: { fontSize: 24, fontWeight: '600', color: COLORS.ink },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 36, height: 36 },
  avatarInitial: { fontSize: 16, fontWeight: '600', color: COLORS.accentDark },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disciplineRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  disciplineCard: { flex: 1, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 16, alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, minHeight: 112, ...CARD_SHADOW },
  disciplineIcon: { alignItems: 'flex-start' },
  disciplineTitle: { fontSize: 17, fontWeight: '600', color: COLORS.ink },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  emptyText: { fontSize: 15, color: COLORS.sub, paddingVertical: 12 },
  seeAll: { fontSize: 14, fontWeight: '600', color: COLORS.accentDark, marginBottom: 8 },
});

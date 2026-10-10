import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Plus } from 'lucide-react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../../constants/theme';
import { useSessionById, useAddClimb, useUpdateSessionDate, useDeleteClimb } from '../../hooks/useSessions';
import { MiniCalendar } from '../../components/MiniCalendar';
import { SwipeableRow } from '../../components/SwipeableRow';
import { AddClimbSheet } from '../../components/AddClimbSheet';
import { StatCard } from '../../components/StatCard';
import { Screen } from '../../components/Screen';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { gradesFor, type Discipline, type Climb } from '../../types/database';
import { disciplineLabel, plural, timeAgo } from '../../lib/sessionFormat';

function toDateInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function SessionDetailScreen() {
  const { id, fromEnd } = useLocalSearchParams<{ id: string; fromEnd?: string }>();
  const router = useRouter();
  // useSessionById (not a manual sessions.find(id)) so this screen keeps
  // working correctly even if `id` was a temp offline id that has since
  // synced to a real one — see hooks/useSessions.ts for why that matters.
  const session = useSessionById(id);

  const [editMode, setEditMode] = useState(false);
  const [addClimbOpen, setAddClimbOpen] = useState(false);

  const addClimb = useAddClimb();
  const updateDate = useUpdateSessionDate();
  const deleteClimb = useDeleteClimb();

  if (!session) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.emptyText}>Session not found.</Text>
      </Screen>
    );
  }

  const discipline: Discipline = session.discipline;
  const grades = gradesFor(discipline);
  const climbs = session.climbs;
  const sentClimbs = climbs.filter((c) => c.sent);
  const topIdx = Math.max(-1, ...sentClimbs.map((c) => grades.indexOf(c.grade)));
  const topGrade = topIdx >= 0 ? grades[topIdx] : '—';

  const pyramid: Record<string, number> = {};
  sentClimbs.forEach((c) => { pyramid[c.grade] = (pyramid[c.grade] ?? 0) + 1; });
  const pyramidGrades = Object.keys(pyramid).sort((a, b) => grades.indexOf(b) - grades.indexOf(a));
  const maxCount = Math.max(1, ...Object.values(pyramid));

  async function handleAddClimb(input: { grade: string; attempts: number; sent: boolean }) {
    await addClimb.mutateAsync({ sessionId: session!.id, ...input, photoUrl: null });
    setAddClimbOpen(false);
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => (editMode ? setEditMode(false) : fromEnd === '1' ? router.replace('/(tabs)') : router.back())} style={styles.backRow} hitSlop={10}>
            <ArrowLeft size={14} color={COLORS.sub} />
            <Text style={styles.backText}>{editMode ? 'Cancel' : 'Back'}</Text>
          </Pressable>
          {!editMode && (
            <Pressable onPress={() => setEditMode(true)}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.metaLabel}>{disciplineLabel(discipline)} session</Text>
        <Text style={styles.gym}>{session.gym_name}</Text>
        {!editMode && <Text style={styles.meta}>{timeAgo(session.started_at)}</Text>}

        {editMode && (
          <View style={{ marginVertical: 16 }}>
            <Text style={styles.sectionLabel}>Date</Text>
            <MiniCalendar
              selectedDate={toDateInputValue(new Date(session.started_at))}
              onSelect={(d) => updateDate.mutate({ sessionId: session.id, startedAt: new Date(`${d}T12:00:00`).toISOString() })}
            />
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard value={climbs.length} label="Climbs" />
          <StatCard value={sentClimbs.length} label="Sent" />
          <StatCard value={topGrade} label="Top send" />
        </View>

        {!editMode && pyramidGrades.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionLabel}>Sends by grade</Text>
            {pyramidGrades.map((g) => (
              <View key={g} style={styles.pyramidRow}>
                <Text style={styles.pyramidGrade}>{g}</Text>
                <View style={[styles.pyramidBar, { width: 20 + (pyramid[g] / maxCount) * 130 }]} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Climbs</Text>
          {editMode && (
            <Pressable onPress={() => setAddClimbOpen(true)} style={styles.addClimbButton}>
              <Plus size={14} color={COLORS.accentDark} />
            </Pressable>
          )}
        </View>

        {climbs.length === 0 && <Text style={styles.emptyText}>No climbs logged.</Text>}
        {climbs.map((c: Climb) => {
          const row = (
            <View style={styles.climbRow}>
              {c.photo_url ? (
                <Image source={{ uri: c.photo_url }} style={styles.climbThumb} />
              ) : (
                <View style={[styles.climbThumb, { backgroundColor: COLORS.border }]} />
              )}
              <Text style={styles.climbText}>{c.grade} · {plural(c.attempts, 'attempt')}</Text>
              {!editMode && (c.sent ? <Check size={16} color={COLORS.success} /> : <Text style={styles.projectTag}>Project</Text>)}
            </View>
          );
          return editMode ? (
            <SwipeableRow key={c.id} id={c.id} itemLabel="this climb" onDelete={() => deleteClimb.mutate(c.id)}>
              {row}
            </SwipeableRow>
          ) : (
            <View key={c.id} style={{ marginBottom: 8 }}>{row}</View>
          );
        })}

        {editMode && <PrimaryButton label="Save changes" onPress={() => setEditMode(false)} style={{ marginTop: 16 }} />}

        {fromEnd === '1' && !editMode && (
          <View style={styles.endActions}>
            {sentClimbs.length > 0 ? (
              <>
                <PrimaryButton label="Share a send" onPress={() => router.push({ pathname: '/share', params: { sessionId: session.id } })} />
                <SecondaryButton label="Done" onPress={() => router.replace('/(tabs)')} />
              </>
            ) : (
              <PrimaryButton label="Done" onPress={() => router.replace('/(tabs)')} />
            )}
          </View>
        )}
      </ScrollView>

      <AddClimbSheet visible={addClimbOpen} discipline={discipline} onAdd={handleAddClimb} onClose={() => setAddClimbOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  editText: { fontSize: 14, fontWeight: '500', color: COLORS.accent },
  metaLabel: { fontSize: 14, color: COLORS.sub, textAlign: 'center' },
  gym: { fontSize: 21, fontWeight: '600', color: COLORS.ink, textAlign: 'center' },
  meta: { fontSize: 15, color: COLORS.sub, textAlign: 'center', marginTop: 2 },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addClimbButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  pyramidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  pyramidGrade: { fontSize: 14, color: COLORS.sub, width: 40 },
  pyramidBar: { height: 14, borderRadius: 4, backgroundColor: COLORS.accent },
  climbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 8, ...CARD_SHADOW },
  climbThumb: { width: 36, height: 36, borderRadius: 8 },
  climbText: { flex: 1, fontSize: 16, color: COLORS.ink },
  projectTag: { fontSize: 14, color: COLORS.sub },
  emptyText: { fontSize: 15, color: COLORS.sub, paddingVertical: 8 },
  endActions: { gap: 10, marginTop: 20 },
});

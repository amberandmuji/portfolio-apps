import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS } from '../../constants/theme';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { SessionRow } from '../../components/SessionRow';
import { useSessions } from '../../hooks/useSessions';
import { LineChart } from '../../components/LineChart';
import { BOULDER_GRADES, ROPE_GRADES, gradesFor, type Climb, type Discipline } from '../../types/database';

type Period = 'month' | '3months' | 'year' | 'all';
const PERIODS: { key: Period; label: string; ms: number }[] = [
  { key: 'month', label: 'This month', ms: 30 * 24 * 3600 * 1000 },
  { key: '3months', label: '3 months', ms: 90 * 24 * 3600 * 1000 },
  { key: 'year', label: 'This year', ms: 365 * 24 * 3600 * 1000 },
  { key: 'all', label: 'All time', ms: Infinity },
];

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StatsScreen() {
  const { data: sessions } = useSessions();
  const [discipline, setDiscipline] = useState<Discipline>('boulder');
  const [period, setPeriod] = useState<Period>('month');

  const grades = gradesFor(discipline);
  const rangeMs = PERIODS.find((p) => p.key === period)!.ms;
  const now = Date.now();

  const periodSessions = (sessions ?? [])
    .filter((s) => now - new Date(s.started_at).getTime() < rangeMs)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const periodClimbs = periodSessions.flatMap((s) => s.climbs ?? []);
  const boulderClimbs = periodSessions.filter((s) => s.discipline === 'boulder').flatMap((s) => s.climbs ?? []);
  const ropeClimbs = periodSessions.filter((s) => s.discipline === 'rope').flatMap((s) => s.climbs ?? []);

  function topOf(climbs: Climb[], gradeList: readonly string[]) {
    const sent = climbs.filter((c) => c.sent);
    if (sent.length === 0) return null;
    const idx = Math.max(...sent.map((c) => gradeList.indexOf(c.grade)).filter((i) => i >= 0));
    return idx >= 0 ? gradeList[idx] : null;
  }
  const topBoulder = topOf(boulderClimbs, BOULDER_GRADES);
  const topRope = topOf(ropeClimbs, ROPE_GRADES);
  const topGradeDisplay = topBoulder && topRope ? `${topBoulder} / ${topRope}` : topBoulder || topRope || '—';

  const disciplineSessions = periodSessions.filter((s) => s.discipline === discipline);

  const chartPoints = disciplineSessions
    .map((s) => {
      const sent = (s.climbs ?? []).filter((c) => c.sent);
      if (sent.length === 0) return null;
      const topIdx = Math.max(...sent.map((c) => grades.indexOf(c.grade)).filter((i: number) => i >= 0));
      if (topIdx < 0) return null;
      return { label: shortDate(s.started_at), value: topIdx, ts: new Date(s.started_at).getTime() };
    })
    .filter((p): p is { label: string; value: number; ts: number } => p !== null)
    .sort((a, b) => a.ts - b.ts);

  return (
    <Screen style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your stats</Text>

      <View style={styles.pillRow}>
        {PERIODS.map((p) => (
          <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.pill, period === p.key && styles.pillActive]}>
            <Text style={[styles.pillText, period === p.key && styles.pillTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statsGrid}>
        <StatCard value={periodSessions.length} label="Sessions" style={styles.statCardGrid} />
        <StatCard value={periodClimbs.length} label="Climbs logged" style={styles.statCardGrid} />
        <StatCard value={periodClimbs.filter((c) => c.sent).length} label="Sends" style={styles.statCardGrid} />
        <StatCard value={topGradeDisplay} label="Top grade" style={styles.statCardGrid} />
      </View>

      <View style={styles.toggleRow}>
        {(['boulder', 'rope'] as Discipline[]).map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              if (d !== discipline) Haptics.selectionAsync();
              setDiscipline(d);
            }}
            style={[styles.toggleButton, discipline === d && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, discipline === d && styles.toggleTextActive]}>{d === 'rope' ? 'Top rope' : 'Bouldering'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Top grade sent per session</Text>
      {chartPoints.length === 0 ? (
        <Text style={styles.emptyText}>No sends in this period yet.</Text>
      ) : (
        <LineChart points={chartPoints} gradeLabels={grades} />
      )}

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{discipline === 'rope' ? 'Top rope' : 'Bouldering'} sessions</Text>
      {disciplineSessions.length === 0 && <Text style={styles.emptyText}>No sessions in this period yet.</Text>}
      <View style={{ gap: 8 }}>
        {disciplineSessions.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink, marginBottom: 16 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.cream },
  pillActive: { backgroundColor: COLORS.accent },
  pillText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  pillTextActive: { color: '#FFFFFF' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statCardGrid: { width: '48%' },
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.cream, borderRadius: RADIUS.control, padding: 4, marginBottom: 16 },
  toggleButton: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.sub },
  toggleTextActive: { color: COLORS.accentDark },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  emptyText: { fontSize: 15, color: COLORS.sub, paddingVertical: 8 },
});

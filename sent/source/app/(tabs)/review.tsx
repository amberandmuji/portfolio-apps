import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, CARD_SHADOW } from '../../constants/theme';
import { Screen } from '../../components/Screen';
import { useSessions } from '../../hooks/useSessions';
import { SessionCalendar, dateKey } from '../../components/SessionCalendar';

type Period = 'month' | 'year';

export default function ReviewScreen() {
  const { data: sessions } = useSessions();
  const [period, setPeriod] = useState<Period>('month');

  const now = new Date();

  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    (sessions ?? []).forEach((s) => set.add(dateKey(new Date(s.started_at))));
    return set;
  }, [sessions]);

  const sessionsInView = (sessions ?? []).filter((s) => {
    const d = new Date(s.started_at);
    return period === 'month'
      ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      : d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <Screen style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review</Text>

      <View style={styles.toggleRow}>
        {(['month', 'year'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              if (p !== period) Haptics.selectionAsync();
              setPeriod(p);
            }}
            style={[styles.toggleButton, period === p && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>{p === 'month' ? 'This month' : 'This year'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>
        {sessionsInView} session{sessionsInView === 1 ? '' : 's'} logged {period === 'month' ? 'this month' : 'this year'}
      </Text>

      <View style={styles.calendarCard}>
        <SessionCalendar sessionDates={sessionDates} mode={period} year={now.getFullYear()} month={now.getMonth()} />
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.cream, borderRadius: RADIUS.control, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.sub },
  toggleTextActive: { color: COLORS.accentDark },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 14 },
  calendarCard: { backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 16, ...CARD_SHADOW },
});

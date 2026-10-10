import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { Screen } from '../components/Screen';
import { SessionRow } from '../components/SessionRow';
import { useSessions } from '../hooks/useSessions';

export default function AllSessionsScreen() {
  const router = useRouter();
  const { data: sessions } = useSessions();

  const sorted = (sessions ?? []).slice().sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
          <ArrowLeft size={14} color={COLORS.sub} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>All sessions</Text>

        {sorted.length === 0 && <Text style={styles.emptyText}>No sessions yet.</Text>}
        <View style={{ gap: 8 }}>
          {sorted.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.ink, marginBottom: 16 },
  emptyText: { fontSize: 15, color: COLORS.sub },
});

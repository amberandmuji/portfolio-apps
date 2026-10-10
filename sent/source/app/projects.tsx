import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mountain, Link as RopeIcon } from 'lucide-react-native';
import { COLORS, TYPE } from '../constants/theme';
import { Screen } from '../components/Screen';
import { BigRow } from '../components/BigRow';
import { SwipeableRow } from '../components/SwipeableRow';
import { AnimatedSheet } from '../components/AnimatedSheet';
import { PrimaryButton } from '../components/Buttons';
import { disciplineLabel, plural } from '../lib/sessionFormat';
import { useSessions, useDeleteClimb } from '../hooks/useSessions';
import { useStartSession } from '../hooks/useSessions';

export default function ProjectsScreen() {
  const router = useRouter();
  const { data: sessions } = useSessions();
  const deleteClimb = useDeleteClimb();
  const startSession = useStartSession();
  const [selected, setSelected] = useState<any | null>(null);
  const [starting, setStarting] = useState(false);

  const allProjects = (sessions ?? [])
    .flatMap((s) => (s.climbs ?? []).filter((c) => !c.sent).map((c) => ({ ...c, session: s })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleContinue(project: any) {
    const startedAt = new Date().toISOString();
    setStarting(true);
    try {
      const session = await startSession.mutateAsync({
        gymId: project.session.gym_id,
        gymName: project.session.gym_name,
        discipline: project.session.discipline,
        startedAt,
      });
      setSelected(null);
      router.push({ pathname: '/logging', params: { sessionId: session.id, discipline: session.discipline } });
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
          <ArrowLeft size={14} color={COLORS.sub} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Project climbs</Text>

        {allProjects.length === 0 && <Text style={styles.emptyText}>No projects yet. Climbs you log as "Not sent" show up here until you send them.</Text>}

        <View style={{ gap: 8 }}>
          {allProjects.map((c) => (
            <SwipeableRow key={c.id} id={c.id} itemLabel="this project" onDelete={() => deleteClimb.mutate(c.id)}>
              <BigRow
                Icon={c.session.discipline === 'rope' ? RopeIcon : Mountain}
                title={disciplineLabel(c.session.discipline)}
                bigText={c.grade}
                metaTop={c.session.gym_name}
                metaBottom={plural(c.attempts, 'attempt')}
                photoUrl={c.photo_url}
                onPress={() => setSelected(c)}
              />
            </SwipeableRow>
          ))}
        </View>
      </ScrollView>

      <AnimatedSheet visible={!!selected} onClose={() => setSelected(null)} maxWidth={320}>
        {selected && (
          <>
            <Text style={styles.modalTitle}>{selected.grade} at {selected.session.gym_name}</Text>
            <Text style={styles.modalMeta}>{plural(selected.attempts, 'attempt')} so far</Text>
            <PrimaryButton label="Continue this route" onPress={() => handleContinue(selected)} loading={starting} />
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </AnimatedSheet>
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
  modalTitle: { ...TYPE.sheetTitle, color: COLORS.ink },
  modalMeta: { fontSize: 14, color: COLORS.sub, marginTop: 2, marginBottom: 16 },
  cancelText: { fontSize: 15, color: COLORS.sub, textAlign: 'center', marginTop: 14 },
});

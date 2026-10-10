import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, interpolateColor, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, TYPE, CARD_SHADOW } from '../constants/theme';
import { Screen } from '../components/Screen';
import { MiniCalendar } from '../components/MiniCalendar';
import { useGyms, useAddGym } from '../hooks/useGyms';
import { useStartSession } from '../hooks/useSessions';
import { PrimaryButton } from '../components/Buttons';
import { SPRING, DURATION } from '../constants/motion';
import type { Discipline } from '../types/database';

function toDateInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function GymCard({ name, selected, disabled, onPress }: { name: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: DURATION.base });
    if (selected) scale.value = withSequence(withTiming(0.97, { duration: 80 }), withSpring(1, SPRING.snappy));
  }, [selected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(204,74,8,0)', COLORS.accent]),
    backgroundColor: COLORS.white,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Animated.View style={[styles.gymRow, cardStyle]}>
        <Text style={[styles.gymText, selected && styles.gymTextSelected]}>{name}</Text>
        <Animated.View style={[styles.checkBadge, checkStyle]}>
          <Check size={14} color={COLORS.white} strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function GymPickerScreen() {
  const router = useRouter();
  const { discipline } = useLocalSearchParams<{ discipline: Discipline }>();
  const { data: gyms } = useGyms();
  const addGym = useAddGym();
  const startSession = useStartSession();

  const [newGymName, setNewGymName] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [starting, setStarting] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  function selectGym(id: string) {
    if (id !== selectedGymId) Haptics.selectionAsync().catch(() => {});
    setSelectedGymId(id);
  }

  async function startWithGym(gymId: string) {
    setStarting(true);
    try {
      const startedAt = new Date(`${date}T12:00:00`).toISOString();
      const gymName = gyms?.find((g) => g.id === gymId)?.name;
      const session = await startSession.mutateAsync({ gymId, gymName, discipline: discipline ?? 'boulder', startedAt });
      router.replace({ pathname: '/logging', params: { sessionId: session.id, discipline: session.discipline } });
    } finally {
      setStarting(false);
    }
  }

  async function handleAddAndStart() {
    const name = newGymName.trim();
    if (!name) return;
    const gym = await addGym.mutateAsync(name);
    setNewGymName('');
    selectGym(gym.id);
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
          <ArrowLeft size={14} color={COLORS.sub} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{discipline === 'rope' ? 'Top rope' : 'Bouldering'} — where are you climbing?</Text>

        <MiniCalendar selectedDate={date} onSelect={setDate} />

        <View style={{ marginTop: 16, gap: 8 }}>
          {(gyms ?? []).map((g) => (
            <GymCard key={g.id} name={g.name} selected={selectedGymId === g.id} disabled={starting} onPress={() => selectGym(g.id)} />
          ))}
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={newGymName}
            onChangeText={setNewGymName}
            placeholder="Add another gym"
            placeholderTextColor={COLORS.placeholder}
            style={styles.input}
          />
          <Pressable onPress={handleAddAndStart} style={styles.addButton} disabled={starting}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </ScrollView>
      {selectedGymId && (
        <Animated.View entering={FadeInDown.duration(DURATION.base)} exiting={FadeOutDown.duration(DURATION.fast)} style={styles.footer}>
          <PrimaryButton label="Start session" onPress={() => startWithGym(selectedGymId)} loading={starting} />
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '500', color: COLORS.sub },
  title: { ...TYPE.pageTitle, color: COLORS.ink, marginBottom: 12 },
  gymRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderRadius: RADIUS.control, padding: 12, ...CARD_SHADOW },
  gymText: { fontSize: 16, color: COLORS.ink },
  gymTextSelected: { fontWeight: '600', color: COLORS.accentDark },
  checkBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 20 },
  input: { flex: 1, height: 40, borderWidth: 1.5, borderColor: COLORS.inputBorder, backgroundColor: COLORS.white, borderRadius: RADIUS.control, paddingHorizontal: 12, fontSize: 16, color: COLORS.ink },
  addButton: { height: 40, paddingHorizontal: 14, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

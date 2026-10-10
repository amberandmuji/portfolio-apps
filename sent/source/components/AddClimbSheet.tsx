import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Minus, Plus, X } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE } from '../constants/theme';
import { gradesFor, defaultGradeFor, type Discipline } from '../types/database';
import { GradePicker } from './GradePicker';
import { AnimatedSheet } from './AnimatedSheet';

interface Props {
  visible: boolean;
  discipline: Discipline;
  onAdd: (input: { grade: string; attempts: number; sent: boolean }) => void;
  onClose: () => void;
}

export function AddClimbSheet({ visible, discipline, onAdd, onClose }: Props) {
  const grades = gradesFor(discipline);
  const [grade, setGrade] = useState(defaultGradeFor(discipline));
  const [attempts, setAttempts] = useState(1);

  function submit(sent: boolean) {
    if (sent) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd({ grade, attempts, sent });
    setGrade(defaultGradeFor(discipline));
    setAttempts(1);
  }

  return (
    <AnimatedSheet visible={visible} onClose={onClose} maxWidth={340}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Add a climb</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={18} color={COLORS.sub} />
        </Pressable>
      </View>

      <Text style={styles.gradeLabel}>Grade</Text>
      <GradePicker discipline={discipline} grades={grades} value={grade} onChange={setGrade} size={36} style={{ marginBottom: 20 }} />

      <View style={styles.stepperRow}>
        <Text style={styles.stepperLabel}>Attempts</Text>
        <Pressable onPress={() => setAttempts((a) => Math.max(1, a - 1))} style={styles.stepperButton}>
          <Minus size={14} color={COLORS.sub} />
        </Pressable>
        <Text style={styles.stepperValue}>{attempts}</Text>
        <Pressable onPress={() => setAttempts((a) => a + 1)} style={styles.stepperButton}>
          <Plus size={14} color={COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => submit(false)} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Next climb</Text>
        </Pressable>
        <Pressable onPress={() => submit(true)} style={styles.primaryButton}>
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Sent</Text>
        </Pressable>
      </View>
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { ...TYPE.sheetTitle, color: COLORS.ink },
  gradeLabel: { fontSize: 14, fontWeight: '500', color: COLORS.sub, textAlign: 'center', marginBottom: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
  stepperLabel: { fontSize: 16, color: COLORS.sub },
  stepperButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 18, fontWeight: '600', color: COLORS.ink, width: 20, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 44, borderRadius: RADIUS.control, borderWidth: 1, borderColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  primaryButton: { flex: 1, height: 44, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

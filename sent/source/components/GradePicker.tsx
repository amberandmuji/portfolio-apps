import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { gradeLabel, type Discipline } from '../types/database';

interface Props {
  discipline: Discipline;
  grades: readonly string[];
  value: string;
  onChange: (grade: string) => void;
  /** Pill height/min-width; the selected pill keeps the same size, only its color changes. */
  size?: number;
  style?: object;
}

// Bouldering grades are laid out as two even rows (VB–V4, then V5–V9+) so
// the whole scale is visible at once; rope grades just wrap.
export function GradePicker({ discipline, grades, value, onChange, size = 36, style }: Props) {
  const pill = (g: string) => {
    const selected = g === value;
    return (
      <Pressable key={g} onPress={() => onChange(g)} style={[styles.pill, { height: size, borderRadius: size / 2, minWidth: size }, selected && styles.pillSelected]}>
        <Text style={[styles.text, selected && styles.textSelected]}>{gradeLabel(g)}</Text>
      </Pressable>
    );
  };

  if (discipline === 'rope') {
    return <View style={[styles.wrapRow, style]}>{grades.map(pill)}</View>;
  }
  const perRow = Math.ceil(grades.length / 2);
  return (
    <View style={[{ gap: 8 }, style]}>
      <View style={styles.row}>{grades.slice(0, perRow).map(pill)}</View>
      <View style={styles.row}>{grades.slice(perRow).map(pill)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pill: { backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pillSelected: { backgroundColor: COLORS.accent },
  text: { fontSize: 14, fontWeight: '600', color: COLORS.sub },
  textSelected: { color: '#FFFFFF' },
});

import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';

interface Props {
  value: string | number;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ value, label, onPress, style }: Props) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={[styles.card, style]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, paddingVertical: 16, ...CARD_SHADOW, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 21, fontWeight: '600', color: COLORS.ink },
  label: { fontSize: 14, color: COLORS.sub, marginTop: 2, textAlign: 'center' },
});
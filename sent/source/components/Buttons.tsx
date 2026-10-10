import type { ReactNode } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, icon, onPress, disabled, loading, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.primary, (disabled || loading) && styles.primaryDisabled, style]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, icon, onPress, disabled, loading, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.secondary, style]}>
      {loading ? (
        <ActivityIndicator color={COLORS.ink} size="small" />
      ) : (
        <>
          {icon}
          <Text style={styles.secondaryText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 48,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.6 },
  primaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondary: {
    height: 48,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '500', color: COLORS.ink },
});

import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, TYPE } from '../constants/theme';
import { AnimatedSheet } from './AnimatedSheet';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** For especially destructive actions (e.g. account deletion) — when
   *  set, the confirm button stays disabled until the user types this
   *  exact word, instead of a single tap being enough. */
  requireTypedConfirmation?: string;
  /** Fires a haptic when confirmed. Reserve 'warning' for especially
   *  severe, rare actions (account deletion) — routine deletes (a climb,
   *  a session) stay silent so the feedback keeps meaning something. */
  haptic?: 'warning';
}

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  requireTypedConfirmation,
  haptic,
}: Props) {
  const [typed, setTyped] = useState('');
  const canConfirm = !requireTypedConfirmation || typed === requireTypedConfirmation;

  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  function handleConfirm() {
    if (haptic === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm();
  }

  return (
    <AnimatedSheet visible={visible} onClose={onCancel} maxWidth={320}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {requireTypedConfirmation && (
        <>
          <Text style={styles.typedHint}>Type {requireTypedConfirmation} to confirm</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            placeholder={requireTypedConfirmation}
            placeholderTextColor={COLORS.placeholder}
            style={styles.typedInput}
          />
        </>
      )}
      <Pressable onPress={handleConfirm} disabled={!canConfirm} style={[styles.dangerButton, !canConfirm && styles.dangerButtonDisabled]}>
        <Text style={styles.dangerText}>{confirmLabel}</Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...TYPE.sheetTitle, color: COLORS.ink, marginBottom: 4 },
  body: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  typedHint: { fontSize: 13, color: COLORS.sub, marginBottom: 6 },
  typedInput: { height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 12, fontSize: 16, color: COLORS.ink, marginBottom: 14 },
  dangerButton: { height: 48, borderRadius: RADIUS.control, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  dangerButtonDisabled: { opacity: 0.5 },
  dangerText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cancelButton: { height: 48, borderRadius: RADIUS.control, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 16, fontWeight: '500', color: COLORS.ink },
});

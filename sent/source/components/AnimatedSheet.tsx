import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { COLORS, RADIUS } from '../constants/theme';
import { DURATION, EASE } from '../constants/motion';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  dismissOnBackdropPress?: boolean;
}

// The shared "backdrop + centered white card" modal shape used by every
// sheet in the app (ConfirmSheet, AddClimbSheet, InfoSheet,
// ReportBugSheet, SignUpSheet, EditProfileModal, AddFriendModal) — a
// scale+fade entrance instead of RN's flat default fade, and tapping the
// backdrop now dismisses (none of these did before).
export function AnimatedSheet({ visible, onClose, children, maxWidth = 360, dismissOnBackdropPress = true }: Props) {
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: DURATION.base, easing: EASE.standard });
    } else {
      progress.value = withTiming(0, { duration: DURATION.fast, easing: EASE.accelerate }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.94 + progress.value * 0.06 }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissOnBackdropPress ? onClose : undefined} />
        <Animated.View style={[styles.card, { maxWidth }, cardStyle]}>{children}</Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(34,34,34,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20 },
});

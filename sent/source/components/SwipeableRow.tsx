import { useEffect, useState, type ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
import { ConfirmSheet } from './ConfirmSheet';
import { COLORS } from '../constants/theme';
import { DURATION, SPRING } from '../constants/motion';

function lightImpact() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const REVEAL = 76; // resting reveal distance once the drag ends
const MAX_DRAG = 160; // hard cap on drag distance, even with rubber-band resistance
const RESISTANCE = 0.35; // how much the drag slows down past REVEAL
const BUTTON_SIZE = 44; // resting delete button size
const BUTTON_GAP = 14; // gap between the row's edge and the delete button

// Only one SwipeableRow may stay revealed at a time, app-wide. Each row
// registers its own "snap closed" function here under its id; starting a
// drag on any row closes whichever other row was previously open. Kept as
// plain module state (not React context) since gesture callbacks run on
// the UI thread and can only cross back to JS via runOnJS with
// serializable args — a string id, not a closure, is what's safe to pass.
const closeRegistry = new Map<string, () => void>();
let activeId: string | null = null;

function notifyOpening(id: string) {
  if (activeId && activeId !== id) {
    closeRegistry.get(activeId)?.();
  }
  activeId = id;
}

function clearIfActive(id: string) {
  if (activeId === id) activeId = null;
}

interface Props {
  children: ReactNode;
  onDelete: () => void;
  itemLabel?: string;
  id: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SwipeableRow({ children, onDelete, itemLabel = 'this item', id }: Props) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(80);
  const hasBuzzed = useSharedValue(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const openConfirm = () => setConfirmOpen(true);

  function close() {
    translateX.value = withTiming(0, { duration: DURATION.base });
  }

  useEffect(() => {
    closeRegistry.set(id, close);
    return () => {
      closeRegistry.delete(id);
      clearIfActive(id);
    };
  }, [id]);

  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(notifyOpening)(id);
      hasBuzzed.value = false;
    })
    .onUpdate((e) => {
      const dragged = Math.min(0, e.translationX);
      if (dragged >= -REVEAL) {
        translateX.value = dragged;
      } else {
        // Rubber-band resistance past the resting reveal point — lets the
        // row (and the delete button behind it) stretch further while
        // actively dragging, overflowing past its normal card bounds.
        const overdrag = -dragged - REVEAL;
        translateX.value = -REVEAL - Math.min(overdrag * RESISTANCE, MAX_DRAG - REVEAL);
        // A light tap the first time this drag crosses into "will delete
        // if released now" territory — mirrors the snap/detent feel of
        // iOS's own swipe actions (e.g. Mail).
        if (!hasBuzzed.value) {
          hasBuzzed.value = true;
          runOnJS(lightImpact)();
        }
      }
    })
    .onEnd(() => {
      const shouldReveal = translateX.value < -REVEAL / 2;
      translateX.value = withSpring(shouldReveal ? -REVEAL : 0, SPRING.gentle);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => {
    const revealAmount = Math.max(0, -translateX.value);
    const restWidth = REVEAL - BUTTON_GAP;
    const overdragProgress = Math.max(0, Math.min(1, (revealAmount - REVEAL) / (MAX_DRAG - REVEAL || 1)));

    const baseWidth = Math.max(BUTTON_SIZE, Math.min(revealAmount, REVEAL) - BUTTON_GAP);
    const width = baseWidth + Math.max(0, rowHeight.value - BUTTON_GAP - restWidth) * overdragProgress;
    const height = BUTTON_SIZE + Math.max(0, rowHeight.value - 16 - BUTTON_SIZE) * overdragProgress;

    return { width, height, borderRadius: height / 2 };
  });

  function handleConfirm() {
    setConfirmOpen(false);
    translateX.value = withTiming(0, { duration: DURATION.fast });
    clearIfActive(id);
    onDelete();
  }

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        rowHeight.value = e.nativeEvent.layout.height;
      }}
    >
      <View style={styles.deleteZone}>
        <AnimatedPressable onPress={openConfirm} style={[styles.deleteButton, buttonStyle]}>
          <Trash2 size={18} color="#FFFFFF" />
        </AnimatedPressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
      <ConfirmSheet
        visible={confirmOpen}
        title={`Delete ${itemLabel}?`}
        body="This can't be undone."
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  deleteZone: { position: 'absolute', right: 0, top: 0, bottom: 0, alignItems: 'flex-end', justifyContent: 'center' },
  deleteButton: {
    backgroundColor: COLORS.dangerStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});

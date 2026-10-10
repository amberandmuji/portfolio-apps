import { useEffect } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { DURATION, SPRING } from '../constants/motion';

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

// Full-screen photo preview — used for project climb photos (Home) and
// shared-post photos (Friends). Closes via the X button or a drag-down
// gesture, with the backdrop fading out as it's dragged.
export function PhotoViewer({ visible, uri, onClose }: Props) {
  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      backdropOpacity.value = 1;
    }
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) return;
      translateY.value = e.translationY;
      backdropOpacity.value = Math.max(0.4, 1 - e.translationY / 400);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: DURATION.base });
        backdropOpacity.value = withTiming(0, { duration: DURATION.base }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, SPRING.gentle);
        backdropOpacity.value = withTiming(1, { duration: DURATION.fast });
      }
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={11}>
          <X size={22} color="#FFFFFF" />
        </Pressable>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: { width: '100%', height: '75%' },
  image: { width: '100%', height: '100%' },
});

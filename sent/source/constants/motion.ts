// Motion tokens — shared timing/easing/spring primitives so animations
// read as one system instead of being reinvented per screen. Modeled on
// iOS's UIKit spring defaults (quick settle, negligible overshoot) and
// Airbnb's preference for snappy, purposeful micro-interactions over
// long or showy ones — most transitions here land under 300ms.
import { Easing } from 'react-native-reanimated';

export const DURATION = {
  fast: 150, // micro state changes
  base: 220, // default — sheet/modal transitions, row swipes settling
  slow: 320, // rare — reserved for one-off celebratory moments
};

export const EASE = {
  standard: Easing.out(Easing.cubic), // entering/settling — the default
  accelerate: Easing.in(Easing.cubic), // exiting/dismissing
};

export const SPRING = {
  // UIKit's default spring feel. Sheet entrances, swipe-row snap-back.
  snappy: { damping: 20, stiffness: 300 },
  // A touch softer — drag-to-dismiss gestures (PhotoViewer, SwipeableRow release).
  gentle: { damping: 18, stiffness: 220 },
  // Deliberate overshoot for rare celebratory moments (success.tsx's
  // check-ring). Don't reuse for routine UI — it should stay rare to
  // still read as special.
  celebratory: { damping: 12, stiffness: 180 },
};

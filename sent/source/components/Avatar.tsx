import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  backgroundColor?: string;
}

// Shared avatar — a real photo when one's set, otherwise the person's
// initial on a colored circle. Used anywhere another user (friend,
// leaderboard entry, activity post) needs a face: friends.tsx,
// friend/[id].tsx.
export function Avatar({ name, avatarUrl, size = 28, backgroundColor = COLORS.friendAvatar }: Props) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[shape, { backgroundColor }]} />;
  }

  return (
    <View style={[shape, styles.placeholder, { backgroundColor }]}>
      <Text style={[styles.initial, { fontSize: size * 0.5 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontWeight: '600' },
});

import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { COLORS, RADIUS, CARD_SHADOW } from '../constants/theme';

interface Props {
  Icon: any;
  title: string;
  bigText: string;
  metaTop?: string;
  metaBottom?: string;
  photoUrl?: string | null;
  onPress?: () => void;
  onPhotoPress?: () => void;
}

// Shared "big" row style used for Project climbs and session lists across
// the app — a plain discipline icon on the left (or the climb's photo,
// when one was uploaded), a title + large stat line in the middle, and
// gym/meta info stacked on the right.
export function BigRow({ Icon, title, bigText, metaTop, metaBottom, photoUrl, onPress, onPhotoPress }: Props) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.bigRow}>
      {photoUrl ? (
        onPhotoPress ? (
          <Pressable onPress={onPhotoPress}>
            <Image source={{ uri: photoUrl }} style={styles.bigRowPhoto} />
          </Pressable>
        ) : (
          <Image source={{ uri: photoUrl }} style={styles.bigRowPhoto} />
        )
      ) : (
        <View style={styles.bigRowIcon}>
          <Icon color={COLORS.accent} size={26} strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.bigRowTitle}>{title}</Text>
        <Text style={styles.bigRowBigText}>{bigText}</Text>
      </View>
      {(metaTop || metaBottom) && (
        <View style={styles.bigRowMeta}>
          {metaTop && <Text style={styles.bigRowMetaTop} numberOfLines={1}>{metaTop}</Text>}
          {metaBottom && <Text style={styles.bigRowMetaBottom}>{metaBottom}</Text>}
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 14, ...CARD_SHADOW },
  bigRowIcon: { width: 40, height: 52, alignItems: 'center', justifyContent: 'center' },
  bigRowPhoto: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accentTint },
  bigRowTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink, marginBottom: 2 },
  bigRowBigText: { fontSize: 22, fontWeight: '300', color: COLORS.ink },
  bigRowMeta: { alignItems: 'flex-end', maxWidth: 110 },
  bigRowMetaTop: { fontSize: 14, color: COLORS.ink },
  bigRowMetaBottom: { fontSize: 13, color: COLORS.sub, marginTop: 2 },
});

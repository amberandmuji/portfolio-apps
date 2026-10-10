import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Which edges to pad for. Tab screens only need 'top' since the bottom
   *  tab bar already accounts for the home indicator; stack screens
   *  (pushed on top of the tab bar, or modals) need both. */
  edges?: ('top' | 'bottom')[];
  /** 'flat' (default): the neutral page background. 'white': plain white (the logging screen). */
  variant?: 'flat' | 'white';
}

// Screens never set their own page background — pick a `variant` instead.
export function Screen({ children, style, edges = ['top', 'bottom'], variant = 'flat' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: variant === 'white' ? COLORS.white : COLORS.pageFlat },
        style,
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

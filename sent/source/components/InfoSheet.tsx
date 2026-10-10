import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, TYPE } from '../constants/theme';
import { AnimatedSheet } from './AnimatedSheet';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Generic scrollable content sheet — used for Help Center, Privacy policy,
// Terms of service, and Contact support.
export function InfoSheet({ visible, title, onClose, children }: Props) {
  return (
    <AnimatedSheet visible={visible} onClose={onClose} maxWidth={400}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={11}>
          <X size={18} color={COLORS.sub} />
        </Pressable>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </AnimatedSheet>
  );
}

interface QAProps {
  question: string;
  answer: string;
}

export function InfoQA({ question, answer }: QAProps) {
  return (
    <View style={styles.qa}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );
}

export function InfoParagraph({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { ...TYPE.sheetTitle, color: COLORS.ink },
  body: { maxHeight: 420 },
  qa: { marginBottom: 16 },
  question: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  answer: { fontSize: 14, lineHeight: 20, color: COLORS.sub },
  paragraph: { fontSize: 14, lineHeight: 20, color: COLORS.sub, marginBottom: 12 },
});

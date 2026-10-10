import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE } from '../constants/theme';
import { PrimaryButton } from './Buttons';
import { AnimatedSheet } from './AnimatedSheet';
import { useSubmitBugReport } from '../hooks/useBugReports';
import { useToast } from '../context/ToastContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReportBugSheet({ visible, onClose }: Props) {
  const [description, setDescription] = useState('');
  const submitBugReport = useSubmitBugReport();
  const { showToast } = useToast();

  function handleClose() {
    setDescription('');
    onClose();
  }

  async function handleSubmit() {
    const trimmed = description.trim();
    if (!trimmed) return;
    await submitBugReport.mutateAsync(trimmed);
    showToast("Thanks — we'll take a look");
    handleClose();
  }

  return (
    <AnimatedSheet visible={visible} onClose={handleClose} maxWidth={380}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Report a bug</Text>
        <Pressable onPress={handleClose} hitSlop={11}>
          <X size={18} color={COLORS.sub} />
        </Pressable>
      </View>
      <Text style={styles.hint}>What happened? Include what you were doing when it went wrong.</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. The app crashed when I tried to add a photo to a climb"
        placeholderTextColor={COLORS.placeholder}
        multiline
        style={styles.input}
        autoFocus
      />
      <PrimaryButton
        label="Send report"
        onPress={handleSubmit}
        disabled={!description.trim()}
        loading={submitBugReport.isPending}
        style={{ marginTop: 16 }}
      />
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { ...TYPE.sheetTitle, color: COLORS.ink },
  hint: { fontSize: 14, color: COLORS.sub, marginBottom: 12, lineHeight: 19 },
  input: { minHeight: 100, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, padding: 12, fontSize: 15, color: COLORS.ink, textAlignVertical: 'top' },
});

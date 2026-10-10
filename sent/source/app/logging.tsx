import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Camera, Check, Minus, Plus } from 'lucide-react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { GradePicker } from '../components/GradePicker';
import { Screen } from '../components/Screen';
import { gradesFor, defaultGradeFor, gradeLabel, type Discipline } from '../types/database';
import { useAddClimb, useEndSession, useDeleteSession } from '../hooks/useSessions';
import { uploadClimbPhoto } from '../lib/uploadPhoto';
import { useToast } from '../context/ToastContext';
import { useIsOnline } from '../context/NetworkContext';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';

export default function LoggingScreen() {
  const router = useRouter();
  const { sessionId, discipline: disciplineParam } = useLocalSearchParams<{ sessionId: string; discipline: Discipline }>();
  const discipline: Discipline = disciplineParam === 'rope' ? 'rope' : 'boulder';
  const grades = gradesFor(discipline);
  const { showToast } = useToast();
  const isOnline = useIsOnline();

  const [grade, setGrade] = useState<string>(defaultGradeFor(discipline));
  const [attempts, setAttempts] = useState(1);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [climbCount, setClimbCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const addClimb = useAddClimb();
  const endSession = useEndSession();
  const deleteSession = useDeleteSession();

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, mediaTypes: ['images'] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, mediaTypes: ['images'] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function pickPhoto() {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function commit(sent: boolean) {
    if (!sessionId) return;
    setUploading(true);
    try {
      let photoUrl: string | null = null;
      let localPhotoUri: string | null = null;
      if (photoUri) {
        // Uploading needs the network — while offline, hand the local
        // file off to the queue instead and let sync upload it later.
        if (isOnline) {
          photoUrl = await uploadClimbPhoto(photoUri);
        } else {
          localPhotoUri = photoUri;
        }
      }
      await addClimb.mutateAsync({ sessionId, grade, attempts, sent, photoUrl, localPhotoUri });
      setClimbCount((n) => n + 1);
      setGrade(defaultGradeFor(discipline));
      setAttempts(1);
      setPhotoUri(null);
      if (sent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast(`${gradeLabel(grade)} sent`);
      } else {
        showToast('Added to your projects');
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleEndSession() {
    if (!sessionId) return;
    if (climbCount === 0) {
      // Nothing was logged — don't leave an empty session in the list.
      deleteSession.mutate(sessionId);
      router.replace('/(tabs)');
      return;
    }
    await endSession.mutateAsync(sessionId);
    router.replace({ pathname: '/session/[id]', params: { id: sessionId, fromEnd: '1' } });
  }

  function handleBack() {
    if (climbCount === 0) {
      deleteSession.mutate(sessionId);
      router.back();
    } else {
      setCancelConfirmOpen(true);
    }
  }

  return (
    <Screen style={styles.screen} variant="white">
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={10}>
          <ArrowLeft size={18} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{discipline === 'rope' ? 'Top rope' : 'Bouldering'}</Text>
        <Pressable onPress={handleEndSession} hitSlop={10}>
          <Text style={styles.endSessionText}>End session</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={pickPhoto} style={styles.photoBox}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Camera size={22} color={COLORS.sub} />
              <Text style={styles.photoHint}>Photo of the route</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.gradeLabel}>Grade</Text>
        <GradePicker discipline={discipline} grades={grades} value={grade} onChange={setGrade} size={40} style={{ marginBottom: 24 }} />

        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Attempts</Text>
          <Pressable onPress={() => setAttempts((a) => Math.max(1, a - 1))} style={styles.stepperButton} accessibilityLabel="Fewer attempts">
            <Minus size={16} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.stepperValue}>{attempts}</Text>
          <Pressable onPress={() => setAttempts((a) => a + 1)} style={styles.stepperButton} accessibilityLabel="More attempts">
            <Plus size={16} color={COLORS.ink} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <SecondaryButton label="Not sent" onPress={() => commit(false)} disabled={uploading} style={{ flex: 1 }} />
          <PrimaryButton label="Sent" icon={<Check size={16} color="#FFFFFF" />} onPress={() => commit(true)} loading={uploading} style={{ flex: 1 }} />
        </View>

        {climbCount > 0 && <Text style={styles.countText}>{climbCount} climb{climbCount === 1 ? '' : 's'} logged this session</Text>}
      </ScrollView>

      <ConfirmSheet
        visible={cancelConfirmOpen}
        title="Cancel this session?"
        body="The climbs you've logged so far will be discarded. This can't be undone."
        confirmLabel="Discard session"
        onConfirm={() => {
          setCancelConfirmOpen(false);
          // "Discard" has to actually discard — delete the session and its climbs.
          deleteSession.mutate(sessionId);
          router.replace('/(tabs)');
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: COLORS.ink },
  endSessionText: { fontSize: 15, fontWeight: '600', color: COLORS.accentDark },
  content: { padding: 20 },
  photoBox: { height: 160, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoHint: { fontSize: 14, color: COLORS.sub },
  gradeLabel: { fontSize: 14, fontWeight: '500', color: COLORS.sub, textAlign: 'center', marginBottom: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 },
  stepperLabel: { fontSize: 16, color: COLORS.sub },
  stepperButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 21, fontWeight: '600', color: COLORS.ink, minWidth: 28, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  countText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginTop: 12 },
});

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Linking, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, Building2, Plus, Camera } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE, CARD_SHADOW } from '../../constants/theme';
import { Screen } from '../../components/Screen';
import { useGyms, useAddGym, useDeleteGym } from '../../hooks/useGyms';
import { useSessions } from '../../hooks/useSessions';
import { useProfile, useUpdateProfile, useIsGuest } from '../../hooks/useProfile';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { uploadAvatarPhoto } from '../../lib/uploadPhoto';
import { InfoSheet, InfoQA, InfoParagraph } from '../../components/InfoSheet';
import { ReportBugSheet } from '../../components/ReportBugSheet';
import { SignUpSheet } from '../../components/SignUpSheet';
import { AnimatedSheet } from '../../components/AnimatedSheet';
import { PrimaryButton } from '../../components/Buttons';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { SwipeableRow } from '../../components/SwipeableRow';
import type { Profile } from '../../types/database';

const SUPPORT_EMAIL = 'support@sentapp.com';

const HELP_FAQS = [
  { q: 'How do I log a session?', a: 'From Home, tap Bouldering or Top Rope, pick your gym, and add climbs as you go — grade, attempts, and whether you sent it.' },
  { q: 'How do I edit or delete a climb?', a: 'Open the session from Home or All Sessions, then swipe left on a climb (or the session itself) to edit or delete it.' },
  { q: "What counts as a 'project'?", a: "Any climb you've logged attempts on but haven't marked as sent yet shows up under Project climbs until you send it." },
  { q: 'Does Sent work without service at the gym?', a: "Yes — sessions and climbs you log offline are queued and sync automatically once you're back online." },
];

const SETTINGS_SECTIONS = [
  { title: 'Account', items: ['Account settings'] },
  { title: 'Support', items: ['Help Center', 'Contact support', 'Report a bug'] },
  { title: 'Legal', items: ['Privacy policy', 'Terms of service'] },
];

function EditProfileModal({
  visible,
  profile,
  onSave,
  onClose,
}: {
  visible: boolean;
  profile: Profile | null | undefined;
  onSave: (update: { display_name: string; bio: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (visible) {
      setName(profile?.display_name ?? '');
      setBio(profile?.bio ?? '');
    }
  }, [visible, profile]);

  async function pickAvatar(source: 'camera' | 'library') {
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1], mediaTypes: ['images'] });
    if (result.canceled) return;

    setAvatarUploading(true);
    try {
      const url = await uploadAvatarPhoto(result.assets[0].uri);
      await updateProfile.mutateAsync({ avatar_url: url });
    } finally {
      setAvatarUploading(false);
    }
  }

  function handlePickAvatar() {
    Alert.alert('Update photo', undefined, [
      { text: 'Take Photo', onPress: () => pickAvatar('camera') },
      { text: 'Choose from Library', onPress: () => pickAvatar('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ display_name: name.trim(), bio: bio.trim() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatedSheet visible={visible} onClose={onClose} maxWidth={320}>
      <Text style={styles.modalTitle}>Edit profile</Text>

      <Pressable onPress={handlePickAvatar} style={styles.modalAvatarWrap}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.modalAvatar} />
        ) : (
          <View style={[styles.modalAvatar, styles.modalAvatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(profile?.display_name ?? 'C').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.avatarEditBadge}>
          {avatarUploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Camera size={14} color="#FFFFFF" />}
        </View>
      </Pressable>

      <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholder="Your name" />
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={styles.bioInput}
        placeholder="Add a short bio"
        placeholderTextColor={COLORS.placeholder}
        multiline
        maxLength={140}
      />
      <PrimaryButton label="Save changes" onPress={handleSave} loading={saving} style={styles.saveButtonSpacing} />
      <Pressable onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable>
    </AnimatedSheet>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: gyms } = useGyms();
  const { data: sessions } = useSessions();
  const { data: profile } = useProfile();
  const { data: isGuest } = useIsGuest();
  const updateProfile = useUpdateProfile();
  const addGym = useAddGym();
  const deleteGym = useDeleteGym();
  const { showToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [addGymOpen, setAddGymOpen] = useState(false);
  const [gymName, setGymName] = useState('');
  const [openSheet, setOpenSheet] = useState<'help' | 'contact' | 'bug' | 'privacy' | 'terms' | null>(null);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const displayName = profile?.display_name ?? 'Climber';

  function handleSettingsPress(label: string) {
    if (label === 'Account settings') router.push('/account-settings');
    else if (label === 'Help Center') setOpenSheet('help');
    else if (label === 'Contact support') setOpenSheet('contact');
    else if (label === 'Report a bug') setOpenSheet('bug');
    else if (label === 'Privacy policy') setOpenSheet('privacy');
    else if (label === 'Terms of service') setOpenSheet('terms');
  }

  async function handleSaveProfile(update: { display_name: string; bio: string }) {
    await updateProfile.mutateAsync(update);
    setEditOpen(false);
    showToast('Profile updated');
  }

  async function handleDeleteGym(id: string) {
    try {
      await deleteGym.mutateAsync(id);
    } catch (e: any) {
      // sessions.gym_id is `on delete restrict` — a gym with logged sessions can't be removed.
      showToast(e?.code === '23503' ? "Can't delete a gym that has sessions — delete those sessions first" : 'Could not delete gym');
    }
  }

  async function handleAddGym() {
    const trimmed = gymName.trim();
    if (!trimmed) return;
    await addGym.mutateAsync(trimmed);
    setGymName('');
    setAddGymOpen(false);
  }

  return (
    <Screen style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        <Pressable onPress={() => setEditOpen(true)} style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
        </Pressable>
        <Text style={styles.name}>{displayName}</Text>
        {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <Text style={styles.subtitle}>{(sessions ?? []).length} sessions logged</Text>
        <Pressable onPress={() => setEditOpen(true)}><Text style={styles.editLink}>Edit profile</Text></Pressable>
      </View>

      {isGuest && (
        <View style={styles.guestBanner}>
          <Text style={styles.guestBannerTitle}>You're using a guest account</Text>
          <Text style={styles.guestBannerBody}>Sign up to save your sessions permanently and add friends.</Text>
          <Pressable onPress={() => setSignUpOpen(true)} style={styles.guestBannerButton}>
            <Text style={styles.guestBannerButtonText}>Sign up</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Your gyms</Text>
        <Pressable onPress={() => setAddGymOpen((v) => !v)} style={styles.addGymButton}>
          <Plus size={13} color={COLORS.accentDark} />
          <Text style={styles.addGymText}>Add gym</Text>
        </Pressable>
      </View>

      {addGymOpen && (
        <View style={styles.addGymRow}>
          <TextInput value={gymName} onChangeText={setGymName} placeholder="Gym name" style={styles.gymInput} autoFocus />
          <Pressable onPress={handleAddGym} style={styles.gymAddButton}>
            <Text style={styles.gymAddButtonText}>Add</Text>
          </Pressable>
        </View>
      )}

      <View style={{ gap: 8 }}>
      {(gyms ?? []).map((g) => (
        <SwipeableRow key={g.id} id={g.id} itemLabel={g.name} onDelete={() => handleDeleteGym(g.id)}>
          <View style={styles.gymRow}>
            <Building2 size={16} color={COLORS.sub} />
            <Text style={styles.gymText}>{g.name}</Text>
          </View>
        </SwipeableRow>
      ))}
      </View>

      {SETTINGS_SECTIONS.map((section) => (
        <View key={section.title} style={{ marginTop: 20 }}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <View style={styles.settingsGroup}>
            {section.items.map((label, i) => (
              <Pressable key={label} onPress={() => handleSettingsPress(label)} style={[styles.settingsRow, i > 0 && styles.settingsRowBorder]}>
                <Text style={styles.settingsLabel}>{label}</Text>
                <ChevronRight size={15} color={COLORS.sub} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable onPress={() => setLogoutOpen(true)} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Log out</Text>
      </Pressable>
      <Text style={styles.version}>Sent v1.0.0</Text>

      <ConfirmSheet
        visible={logoutOpen}
        title="Log out?"
        body={isGuest ? "You're on a guest account — logging out will lose your sessions. Sign up first to keep them." : 'You can log back in any time.'}
        confirmLabel="Log out"
        onConfirm={() => {
          setLogoutOpen(false);
          supabase.auth.signOut();
        }}
        onCancel={() => setLogoutOpen(false)}
      />

      <EditProfileModal visible={editOpen} profile={profile} onSave={handleSaveProfile} onClose={() => setEditOpen(false)} />

      <InfoSheet visible={openSheet === 'help'} title="Help Center" onClose={() => setOpenSheet(null)}>
        {HELP_FAQS.map((item) => (
          <InfoQA key={item.q} question={item.q} answer={item.a} />
        ))}
      </InfoSheet>

      <InfoSheet visible={openSheet === 'contact'} title="Contact support" onClose={() => setOpenSheet(null)}>
        <InfoParagraph>
          Reach us at {SUPPORT_EMAIL} and we'll get back to you as soon as we can.
        </InfoParagraph>
        <PrimaryButton
          label="Email us"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Sent support')}`)}
        />
      </InfoSheet>

      <InfoSheet visible={openSheet === 'privacy'} title="Privacy policy" onClose={() => setOpenSheet(null)}>
        <InfoParagraph>
          Sent stores the session, climb, and gym data you log so it can show it back to you and, if you add friends, share your sends with them.
        </InfoParagraph>
        <InfoParagraph>
          Photos you attach to a climb are stored in our hosting provider and are only visible to you and friends you've accepted.
        </InfoParagraph>
        <InfoParagraph>
          We don't sell your data. You can delete your account and all associated data at any time from this screen.
        </InfoParagraph>
      </InfoSheet>

      <InfoSheet visible={openSheet === 'terms'} title="Terms of service" onClose={() => setOpenSheet(null)}>
        <InfoParagraph>
          Sent is provided as-is to help you track your climbing sessions. You're responsible for the accuracy of what you log and for your own safety while climbing.
        </InfoParagraph>
        <InfoParagraph>
          Don't use Sent to post content that's abusive, illegal, or infringes on someone else's rights — we may remove content or suspend accounts that do.
        </InfoParagraph>
      </InfoSheet>

      <ReportBugSheet visible={openSheet === 'bug'} onClose={() => setOpenSheet(null)} />

      <SignUpSheet
        visible={signUpOpen}
        reason="Sign up to save your sessions permanently and add friends."
        onClose={() => setSignUpOpen(false)}
        onSuccess={() => {
          setSignUpOpen(false);
          showToast('Account created — your data is saved');
        }}
      />
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  avatarImage: { width: 64, height: 64 },
  avatarInitial: { fontSize: 26, fontWeight: '600', color: COLORS.accentDark },
  name: { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  bio: { fontSize: 14, color: COLORS.ink, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 2 },
  editLink: { fontSize: 14, fontWeight: '500', color: COLORS.accentDark, marginTop: 8 },
  guestBanner: { backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 16, marginBottom: 24 },
  guestBannerTitle: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  guestBannerBody: { fontSize: 14, color: COLORS.accentDark, marginBottom: 12, lineHeight: 19 },
  guestBannerButton: { height: 40, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  guestBannerButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  addGymButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addGymText: { fontSize: 14, fontWeight: '600', color: COLORS.accentDark },
  addGymRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  gymInput: { flex: 1, height: 40, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 12, fontSize: 16 },
  gymAddButton: { height: 40, paddingHorizontal: 14, borderRadius: RADIUS.control, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  gymAddButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: RADIUS.card, padding: 10, ...CARD_SHADOW },
  gymText: { fontSize: 16, color: COLORS.ink },
  settingsGroup: { backgroundColor: COLORS.bg, borderRadius: RADIUS.card, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  settingsRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  settingsLabel: { fontSize: 16, color: COLORS.ink },
  signOutButton: { height: 44, borderRadius: RADIUS.control, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8 },
  signOutText: { fontSize: 16, fontWeight: '500', color: COLORS.danger },
  version: { fontSize: 14, color: COLORS.sub, textAlign: 'center' },
  modalTitle: { ...TYPE.sheetTitle, color: COLORS.ink, marginBottom: 16, textAlign: 'center' },
  modalAvatarWrap: { alignSelf: 'center', marginBottom: 16 },
  modalAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentTint, alignItems: 'center', justifyContent: 'center' },
  modalAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: { height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, paddingHorizontal: 12, fontSize: 16, marginBottom: 12 },
  bioInput: { minHeight: 64, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.control, padding: 12, fontSize: 15, color: COLORS.ink, textAlignVertical: 'top', marginBottom: 16 },
  saveButtonSpacing: { marginBottom: 10 },
  cancelText: { fontSize: 14, color: COLORS.sub, textAlign: 'center' },
});

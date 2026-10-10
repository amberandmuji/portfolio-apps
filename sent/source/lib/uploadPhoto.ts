import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

const BUCKET = 'climb-photos';
// A camera photo can be 3000-4000px wide and several MB uncompressed —
// way more resolution than a phone screen (or storage budget) needs.
// Downscaling to this before upload cuts that to a few hundred KB with
// no visible quality loss in the app.
const MAX_DIMENSION = 1440;
const COMPRESS_QUALITY = 0.7;

function getImageWidth(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    Image.getSize(uri, (width) => resolve(width), () => resolve(null));
  });
}

async function compress(localUri: string): Promise<string> {
  const originalWidth = await getImageWidth(localUri);
  const context = ImageManipulator.manipulate(localUri);
  // Only resize if we know it's actually larger — never upscale.
  if (!originalWidth || originalWidth > MAX_DIMENSION) {
    context.resize({ width: MAX_DIMENSION });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

async function uploadToPath(localUri: string, path: string): Promise<string> {
  const compressedUri = await compress(localUri);
  const base64 = await FileSystem.readAsStringAsync(compressedUri, { encoding: FileSystem.EncodingType.Base64 });

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadClimbPhoto(localUri: string): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');
  return uploadToPath(localUri, `${userData.user.id}/${Date.now()}.jpg`);
}

export async function uploadAvatarPhoto(localUri: string): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');
  return uploadToPath(localUri, `${userData.user.id}/avatar-${Date.now()}.jpg`);
}

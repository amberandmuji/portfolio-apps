import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Signs in with Google via Supabase's OAuth flow: opens the Google consent
 * screen in a native browser session, waits for it to redirect back into
 * the app via the `sent://` scheme, then hands the returned tokens to
 * Supabase to establish the session.
 *
 * Requires the Google provider to be enabled in Supabase (Authentication ->
 * Providers -> Google, with a Client ID/Secret from Google Cloud Console)
 * and `sent://auth-callback` added as an authorized redirect URI there.
 */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled');
  }

  const { params, errorCode } = extractParams(result.url);
  if (errorCode) throw new Error(errorCode);
  if (!params.access_token || !params.refresh_token) {
    throw new Error('Google sign-in did not return a session');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (sessionError) throw sessionError;
}

function extractParams(url: string): { params: Record<string, string>; errorCode?: string } {
  // Supabase returns tokens in the URL fragment (#access_token=...), not
  // the query string, so we parse it manually rather than using
  // Linking.parse (which only reads searchParams).
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  new URLSearchParams(fragment).forEach((value, key) => {
    params[key] = value;
  });
  return { params, errorCode: params.error_description ?? params.error };
}

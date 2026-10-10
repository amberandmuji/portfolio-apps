import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single();
      if (error) throw error;
      return data;
    },
  });
}

// True for accounts created via "Continue as guest" (supabase.auth.signInAnonymously).
// Guests have no email, so they can't be found by useSendFriendRequest's
// email lookup and have no way to recover the account if the app is
// deleted — surfaced in Profile and gated on the friends-adding flows.
export function useIsGuest() {
  return useQuery({
    queryKey: ['is-guest'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return !!data.user?.is_anonymous;
    },
  });
}

type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url'>>;

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not signed in');
      const { error } = await supabase.from('profiles').update(update).eq('id', userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// Permanently deletes the signed-in user's account via the delete_own_account
// RPC (schema.sql) — cascades through all their data server-side. The
// caller is responsible for signing out afterward; the deleted user's
// session is otherwise still holding a technically-valid JWT client-side.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FriendRow {
  friendship_id: string;
  other_user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'pending' | 'accepted';
  is_incoming: boolean;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  top_grade: string | null;
  top_grade_rank: number;
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase.rpc('get_friends');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc('get_leaderboard');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not signed in');

      const { data: found, error: searchError } = await supabase.rpc('find_user_by_email', { search_email: email });
      if (searchError) throw searchError;
      if (!found || found.length === 0) throw new Error('No climber found with that email');

      const friendId = found[0].id;
      const { error } = await supabase.from('friendships').insert({ user_id: userData.user.id, friend_id: friendId, status: 'pending' });
      if (error) throw error;
      return found[0];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });
}

export interface FoundUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useFindUserById(targetId: string | undefined) {
  return useQuery({
    queryKey: ['find-user-by-id', targetId],
    queryFn: async (): Promise<FoundUser | null> => {
      const { data, error } = await supabase.rpc('find_user_by_id', { target_id: targetId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!targetId,
  });
}

export function useSendFriendRequestById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.rpc('send_friend_request_by_id', { target_id: targetId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Gym } from '../types/database';

export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async (): Promise<Gym[]> => {
      const { data, error } = await supabase.from('gyms').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddGym() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not signed in');
      const { data, error } = await supabase.from('gyms').insert({ user_id: userData.user.id, name }).select().single();
      if (error) throw error;
      return data as Gym;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gyms'] }),
  });
}

export function useDeleteGym() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gyms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gyms'] }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ActivityItem {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  grade: string;
  gym_name: string;
  photo_url: string | null;
  created_at: string;
}

// shared_posts references auth.users (not profiles) for its FK, so
// PostgREST can't auto-embed profiles in one query — we fetch the posts +
// climb/gym info, then fetch the small set of matching profiles and merge
// client-side.
export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data: posts, error } = await supabase
        .from('shared_posts')
        .select('id, user_id, created_at, climbs(grade, photo_url, sessions(gyms(name)))')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const userIds = [...new Set(posts.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return posts.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        display_name: profileById.get(p.user_id)?.display_name ?? 'Climber',
        avatar_url: profileById.get(p.user_id)?.avatar_url ?? null,
        grade: p.climbs?.grade ?? '—',
        gym_name: p.climbs?.sessions?.gyms?.name ?? 'Unknown gym',
        photo_url: p.climbs?.photo_url ?? null,
        created_at: p.created_at,
      }));
    },
  });
}

export function useSharePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (climbId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not signed in');
      const { error } = await supabase.from('shared_posts').insert({ climb_id: climbId, user_id: userData.user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity'] }),
  });
}

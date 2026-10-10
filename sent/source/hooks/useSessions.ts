import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useIsOnline } from '../context/NetworkContext';
import { enqueue, makeTempId, isTempId, resolveId, cancelQueuedActionsWhere } from '../lib/offlineQueue';
import type { Session, Climb, Discipline } from '../types/database';

// Fetches every session for the signed-in user, most recent first, with
// each session's gym name joined in and its climbs nested underneath.
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, gyms(name), climbs(*)')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        gym_name: row.gyms?.name,
        climbs: row.climbs ?? [],
      }));
    },
  });
}

/**
 * Looks up a session by id, but stays correct across the moment a
 * temp-id session (created offline) syncs and gets replaced by its real
 * row: if the id we were given can't be found (because it just got synced
 * away), this resolves it through the offline id map and re-looks-up
 * under the real id instead of just returning nothing.
 */
export function useSessionById(id: string | undefined): Session | undefined {
  const { data: sessions } = useSessions();
  const [lookupId, setLookupId] = useState(id);

  useEffect(() => setLookupId(id), [id]);

  const found = sessions?.find((s) => s.id === lookupId);

  useEffect(() => {
    if (!found && lookupId) {
      resolveId(lookupId).then((realId) => {
        if (realId !== lookupId) setLookupId(realId);
      });
    }
  }, [found, lookupId, sessions]);

  return found;
}

interface StartSessionInput {
  gymId: string;
  gymName?: string; // used only for the optimistic offline row's display
  discipline: Discipline;
  startedAt: string; // ISO timestamp, lets the caller backdate
}

export function useStartSession() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async ({ gymId, gymName, discipline, startedAt }: StartSessionInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      if (isOnline) {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ user_id: userId, gym_id: gymId, discipline, started_at: startedAt })
          .select()
          .single();
        if (error) throw error;
        return { ...data, gym_name: gymName, climbs: [] } as Session;
      }

      // Offline: create the row locally with a temp id, queue the real
      // insert, and let the queue remap dependent actions once it syncs.
      const tempId = makeTempId();
      await enqueue('startSession', { tempId, userId, gymId, discipline, startedAt });
      const optimisticSession: Session = {
        id: tempId,
        user_id: userId,
        gym_id: gymId,
        discipline,
        started_at: startedAt,
        ended_at: null,
        gym_name: gymName,
        climbs: [],
      };
      return optimisticSession;
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) => [newSession, ...(old ?? [])]);
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const realId = await resolveId(sessionId);
      const endedAt = new Date().toISOString();
      if (isOnline && !isTempId(realId)) {
        const { error } = await supabase.from('sessions').update({ ended_at: endedAt }).eq('id', realId);
        if (error) throw error;
      } else {
        await enqueue('endSession', { sessionId, endedAt });
      }
      return { sessionId, endedAt };
    },
    onSuccess: ({ sessionId, endedAt }) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) =>
        (old ?? []).map((s) => (s.id === sessionId ? { ...s, ended_at: endedAt } : s))
      );
    },
  });
}

interface AddClimbInput {
  sessionId: string;
  grade: string;
  attempts: number;
  sent: boolean;
  photoUrl?: string | null; // set when already uploaded (online path)
  localPhotoUri?: string | null; // set when offline — uploaded during sync
}

export function useAddClimb() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async (input: AddClimbInput) => {
      const { sessionId, grade, attempts, sent, photoUrl, localPhotoUri } = input;
      const realSessionId = await resolveId(sessionId);

      if (isOnline && !isTempId(realSessionId)) {
        const { data, error } = await supabase
          .from('climbs')
          .insert({ session_id: realSessionId, grade, attempts, sent, photo_url: photoUrl ?? null })
          .select()
          .single();
        if (error) throw error;
        // Cache is keyed by whatever id the caller/UI is currently using
        // for this session (sessionId), which by now should equal realSessionId.
        return { sessionId, climb: data as Climb };
      }

      // Offline (or the parent session itself hasn't synced yet): queue
      // the insert. If a photo was captured, its local uri travels with
      // the queued action and gets uploaded during sync, not now.
      const tempClimbId = makeTempId();
      await enqueue('addClimb', { sessionId, grade, attempts, sent, photoUrl, localPhotoUri, tempClimbId });
      const optimisticClimb: Climb = {
        id: tempClimbId,
        session_id: sessionId,
        grade,
        attempts,
        sent,
        photo_url: localPhotoUri ?? photoUrl ?? null,
        created_at: new Date().toISOString(),
      };
      return { sessionId, climb: optimisticClimb };
    },
    onSuccess: ({ sessionId, climb }) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) =>
        (old ?? []).map((s) => (s.id === sessionId ? { ...s, climbs: [...s.climbs, climb] } : s))
      );
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (isTempId(sessionId)) {
        // Never made it to the server — just cancel every queued action
        // that referenced this session (its own creation, its climbs, etc).
        await cancelQueuedActionsWhere(
          (a) => a.payload.tempId === sessionId || a.payload.sessionId === sessionId
        );
      } else if (isOnline) {
        const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
        if (error) throw error;
      } else {
        await enqueue('deleteSession', { sessionId });
      }
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) => (old ?? []).filter((s) => s.id !== sessionId));
    },
  });
}

export function useUpdateSessionDate() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async ({ sessionId, startedAt }: { sessionId: string; startedAt: string }) => {
      if (isOnline && !isTempId(sessionId)) {
        const { error } = await supabase.from('sessions').update({ started_at: startedAt }).eq('id', sessionId);
        if (error) throw error;
      } else {
        await enqueue('updateSessionDate', { sessionId, startedAt });
      }
      return { sessionId, startedAt };
    },
    onSuccess: ({ sessionId, startedAt }) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) =>
        (old ?? []).map((s) => (s.id === sessionId ? { ...s, started_at: startedAt } : s))
      );
    },
  });
}

export function useDeleteClimb() {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  return useMutation({
    mutationFn: async (climbId: string) => {
      if (isTempId(climbId)) {
        await cancelQueuedActionsWhere((a) => a.payload.tempClimbId === climbId);
      } else if (isOnline) {
        const { error } = await supabase.from('climbs').delete().eq('id', climbId);
        if (error) throw error;
      } else {
        await enqueue('deleteClimb', { climbId });
      }
      return climbId;
    },
    onSuccess: (climbId) => {
      queryClient.setQueryData<Session[]>(['sessions'], (old) =>
        (old ?? []).map((s) => ({ ...s, climbs: s.climbs.filter((c) => c.id !== climbId) }))
      );
    },
  });
}

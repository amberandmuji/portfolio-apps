import { supabase } from './supabase';
import { uploadClimbPhoto } from './uploadPhoto';
import { getQueue, dequeue, recordIdMapping, resolveId, isTempId, type QueuedAction } from './offlineQueue';

/**
 * Replays every queued action against Supabase, in order. Stops at the
 * first action that still fails (network blip, server error) so we don't
 * skip ahead and desync the order — it'll retry from there on the next
 * sync pass. Returns how many actions were successfully synced.
 */
export async function syncOfflineQueue(): Promise<number> {
  const queue = await getQueue();
  let synced = 0;

  for (const action of queue) {
    try {
      await runAction(action);
      await dequeue(action.id);
      synced++;
    } catch (e) {
      console.warn('Offline sync stopped at action', action.type, e);
      break;
    }
  }
  return synced;
}

async function runAction(action: QueuedAction) {
  const { type, payload } = action;

  switch (type) {
    case 'startSession': {
      const { data, error } = await supabase
        .from('sessions')
        .insert({ user_id: payload.userId, gym_id: payload.gymId, discipline: payload.discipline, started_at: payload.startedAt })
        .select()
        .single();
      if (error) throw error;
      if (isTempId(payload.tempId)) await recordIdMapping(payload.tempId, data.id);
      return data;
    }
    case 'endSession': {
      const sessionId = await resolveId(payload.sessionId);
      const { error } = await supabase.from('sessions').update({ ended_at: payload.endedAt }).eq('id', sessionId);
      if (error) throw error;
      return;
    }
    case 'addClimb': {
      const sessionId = await resolveId(payload.sessionId);
      let photoUrl = payload.photoUrl ?? null;
      if (payload.localPhotoUri) {
        // The photo itself couldn't upload while offline — do it now,
        // right before inserting the row that references it.
        photoUrl = await uploadClimbPhoto(payload.localPhotoUri);
      }
      const { error } = await supabase
        .from('climbs')
        .insert({ session_id: sessionId, grade: payload.grade, attempts: payload.attempts, sent: payload.sent, photo_url: photoUrl });
      if (error) throw error;
      return;
    }
    case 'deleteClimb': {
      // Climb ids are only ever real (climbs can't be referenced before
      // they're created), so no id resolution needed here.
      const { error } = await supabase.from('climbs').delete().eq('id', payload.climbId);
      if (error) throw error;
      return;
    }
    case 'deleteSession': {
      const sessionId = await resolveId(payload.sessionId);
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      return;
    }
    case 'updateSessionDate': {
      const sessionId = await resolveId(payload.sessionId);
      const { error } = await supabase.from('sessions').update({ started_at: payload.startedAt }).eq('id', sessionId);
      if (error) throw error;
      return;
    }
  }
}

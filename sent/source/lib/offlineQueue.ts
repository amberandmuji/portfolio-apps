import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A durable, ordered queue of writes that couldn't reach Supabase yet.
 *
 * Design: each queued action is one Supabase write. Actions are replayed
 * in the order they were queued, so "start session" always runs before an
 * "add climb" that depends on it. Because a session created offline
 * doesn't have a real database id yet, we hand it a temporary id
 * (`temp-<uuid>`) immediately so the UI has something to reference, queue
 * the real insert, and remap every dependent action's session_id once the
 * real id comes back from Supabase (see `resolveId` in offlineSync.ts).
 */

export type QueuedActionType =
  | 'startSession'
  | 'endSession'
  | 'addClimb'
  | 'deleteClimb'
  | 'deleteSession'
  | 'updateSessionDate';

export interface QueuedAction {
  id: string; // queue entry id, not a database id
  type: QueuedActionType;
  payload: Record<string, any>;
  createdAt: number;
}

const QUEUE_KEY = 'offline-queue:v1';
const ID_MAP_KEY = 'offline-queue:id-map:v1';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function makeTempId() {
  return `temp-${uid()}${Date.now()}`;
}
export function isTempId(id: string | undefined | null) {
  return !!id && id.startsWith('temp-');
}

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setQueue(queue: QueuedAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(type: QueuedActionType, payload: Record<string, any>): Promise<QueuedAction> {
  const queue = await getQueue();
  const action: QueuedAction = { id: uid(), type, payload, createdAt: Date.now() };
  queue.push(action);
  await setQueue(queue);
  return action;
}

export async function dequeue(actionId: string) {
  const queue = await getQueue();
  await setQueue(queue.filter((a) => a.id !== actionId));
}

export async function queueLength(): Promise<number> {
  return (await getQueue()).length;
}

export async function cancelQueuedActionsWhere(predicate: (action: QueuedAction) => boolean) {
  const queue = await getQueue();
  await setQueue(queue.filter((a) => !predicate(a)));
}

// --- temp id -> real id map, so later actions referencing a
// not-yet-synced session resolve to the real row once it exists ---

export async function getIdMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(ID_MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function recordIdMapping(tempId: string, realId: string) {
  const map = await getIdMap();
  map[tempId] = realId;
  await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
}

export async function resolveId(id: string): Promise<string> {
  if (!isTempId(id)) return id;
  const map = await getIdMap();
  return map[id] ?? id;
}

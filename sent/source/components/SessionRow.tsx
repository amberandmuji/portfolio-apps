import { useRouter } from 'expo-router';
import { Mountain, Link as RopeIcon } from 'lucide-react-native';
import { BigRow } from './BigRow';
import { SwipeableRow } from './SwipeableRow';
import { useDeleteSession } from '../hooks/useSessions';
import { disciplineLabel, plural, timeAgo, topGradeOfSession } from '../lib/sessionFormat';
import type { Session } from '../types/database';

// One session in a list: swipe to delete, tap to open. Used by Home,
// Stats and All Sessions so the three lists can't drift apart.
export function SessionRow({ session }: { session: Session }) {
  const router = useRouter();
  const deleteSession = useDeleteSession();
  const top = topGradeOfSession(session);
  return (
    <SwipeableRow id={session.id} itemLabel="this session" onDelete={() => deleteSession.mutate(session.id)}>
      <BigRow
        Icon={session.discipline === 'rope' ? RopeIcon : Mountain}
        title={disciplineLabel(session.discipline)}
        bigText={`${plural(session.climbs.length, 'climb')}${top ? ` · ${top}` : ''}`}
        metaTop={session.gym_name ?? undefined}
        metaBottom={timeAgo(session.started_at)}
        onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      />
    </SwipeableRow>
  );
}

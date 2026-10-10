import { gradesFor, type Session } from '../types/database';

// "just now" / "5m ago" / "3h ago" / "2d ago", then an absolute date once
// it's a week or older — "45d ago" reads worse than "Aug 24".
export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function topGradeOfSession(session: Session) {
  const grades = gradesFor(session.discipline);
  const sent = session.climbs.filter((c) => c.sent);
  if (sent.length === 0) return null;
  const idx = Math.max(...sent.map((c) => grades.indexOf(c.grade)).filter((i) => i >= 0));
  return idx >= 0 ? grades[idx] : null;
}

export function disciplineLabel(discipline: Session['discipline']) {
  return discipline === 'rope' ? 'Top rope' : 'Bouldering';
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

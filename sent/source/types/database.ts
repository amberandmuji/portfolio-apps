export type Discipline = 'boulder' | 'rope';

export const BOULDER_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'] as const;
export const ROPE_GRADES = [
  '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d',
] as const;

// Display label for a stored grade. The top bouldering bucket is stored as
// 'V10' (the leaderboard SQL ranks on it) but shown as the open-ended 'V9+'.
export function gradeLabel(grade: string) {
  return grade === 'V10' ? 'V9+' : grade;
}
export function gradesFor(discipline: Discipline): readonly string[] {
  return discipline === 'rope' ? ROPE_GRADES : BOULDER_GRADES;
}
export function defaultGradeFor(discipline: Discipline) {
  return discipline === 'rope' ? '5.9' : 'V5';
}

export interface Gym {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  gym_id: string;
  discipline: Discipline;
  started_at: string;
  ended_at: string | null;
  // joined from gyms table
  gym_name?: string;
  // joined from climbs table
  climbs: Climb[];
}

export interface Climb {
  id: string;
  session_id: string;
  grade: string;
  attempts: number;
  sent: boolean;
  photo_url: string | null;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  // joined from the friend's profile
  friend_display_name?: string;
  friend_avatar_url?: string | null;
}

export interface SharedPost {
  id: string;
  climb_id: string;
  user_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface BugReport {
  id: string;
  user_id: string;
  description: string;
  app_version: string | null;
  platform: string | null;
  status: 'new' | 'in_review' | 'resolved';
  created_at: string;
}

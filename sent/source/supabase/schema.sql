-- Run this in the Supabase SQL editor (or via `supabase db push` if you set
-- up the CLI) to create the schema from the planning diagram.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Climber',
  avatar_url text,
  bio text
);

-- Added after the initial launch — safe to re-run against an existing
-- database since IF NOT EXISTS makes it a no-op there.
alter table profiles add column if not exists bio text;

create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete restrict,
  discipline text not null check (discipline in ('boulder', 'rope')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists climbs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  grade text not null,
  attempts int not null default 1,
  sent boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create table if not exists shared_posts (
  id uuid primary key default gen_random_uuid(),
  climb_id uuid not null references climbs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bug reports submitted from Profile > Support > Report a bug.
create table if not exists bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  app_version text,
  platform text,
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved')),
  created_at timestamptz not null default now()
);

-- Row level security: every table is locked down by default, then opened
-- up per-policy. This is what replaces hand-written authorization checks.

alter table profiles enable row level security;
alter table gyms enable row level security;
alter table sessions enable row level security;
alter table climbs enable row level security;
alter table friendships enable row level security;
alter table shared_posts enable row level security;
alter table bug_reports enable row level security;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Lets a user look up a specific other user by exact email to send a
-- friend request, without opening up the profiles table to general
-- browsing (the base RLS policy above only allows reading your own row).
create or replace function public.find_user_by_email(search_email text)
returns table (id uuid, display_name text, avatar_url text)
language plpgsql security definer
as $$
begin
  return query
  select p.id, p.display_name, p.avatar_url
  from profiles p
  where lower(p.email) = lower(search_email)
    and p.id != auth.uid();
end;
$$;

create policy "manage own gyms" on gyms for all using (auth.uid() = user_id);

create policy "manage own sessions" on sessions for all using (auth.uid() = user_id);

-- Climbs are governed through their parent session's ownership.
create policy "manage own climbs" on climbs for all using (
  exists (select 1 from sessions where sessions.id = climbs.session_id and sessions.user_id = auth.uid())
);

create policy "manage own friendships" on friendships for all using (
  auth.uid() = user_id or auth.uid() = friend_id
);

-- Looks up a specific other user by id — used by the QR code / invite
-- link add-friend flow (app/add-friend.tsx), which arrives with a uid
-- but no email, so find_user_by_email doesn't apply. Same
-- security-definer pattern: bypasses the base "read own profile only"
-- policy just enough to resolve a name/avatar to show a confirm screen.
create or replace function public.find_user_by_id(target_id uuid)
returns table (id uuid, display_name text, avatar_url text)
language plpgsql security definer
as $$
begin
  return query
  select p.id, p.display_name, p.avatar_url
  from profiles p
  where p.id = target_id
    and p.id != auth.uid();
end;
$$;

-- Sends a friend request from a known target id (QR scan / invite link),
-- as opposed to useSendFriendRequest's email lookup. Validation lives
-- here instead of the client so both entry points can't be tricked into
-- self-requests or duplicate rows, and so the error message is friendly
-- rather than a raw unique-constraint violation.
create or replace function public.send_friend_request_by_id(target_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if target_id = auth.uid() then
    raise exception 'You can''t add yourself as a friend';
  end if;

  if exists (
    select 1 from friendships
    where (user_id = auth.uid() and friend_id = target_id)
       or (user_id = target_id and friend_id = auth.uid())
  ) then
    raise exception 'You''re already friends, or have a pending request, with this climber';
  end if;

  insert into friendships (user_id, friend_id, status)
  values (auth.uid(), target_id, 'pending');
end;
$$;

-- Lets a signed-in user permanently delete their own account (Profile >
-- Account settings > Delete account). Deleting the auth.users row cascades
-- through every table below via their "on delete cascade" foreign keys —
-- profiles, gyms, sessions (and climbs through sessions), friendships,
-- shared_posts, and bug_reports all clear out automatically, no manual
-- cleanup needed here. Deleting from auth.users requires elevated
-- privileges a normal client role doesn't have, which is exactly what
-- security definer grants (running as the function's owner, not the
-- caller) — this is Supabase's documented pattern for self-service
-- account deletion.
create or replace function public.delete_own_account()
returns void
language plpgsql security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Shared posts: the owner can manage their own, and accepted friends can read them.
create policy "manage own shared posts" on shared_posts for all using (auth.uid() = user_id);
create policy "friends can read shared posts" on shared_posts for select using (
  exists (
    select 1 from friendships
    where status = 'accepted'
      and ((user_id = auth.uid() and friend_id = shared_posts.user_id)
        or (friend_id = auth.uid() and user_id = shared_posts.user_id))
  )
);

-- Users can file and re-read their own bug reports, but not edit or delete
-- them once submitted — triage (status changes) happens from the Supabase
-- dashboard using the service role, which bypasses RLS entirely.
create policy "submit own bug reports" on bug_reports for insert with check (auth.uid() = user_id);
create policy "read own bug reports" on bug_reports for select using (auth.uid() = user_id);

-- Auto-create a profiles row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', 'Climber'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage bucket for route photos. Public read (so friends' shared photos
-- load without a signed URL), but writes are restricted to the user's own
-- folder — see lib/uploadPhoto.ts, which uploads to `{user_id}/...`.
insert into storage.buckets (id, name, public)
values ('climb-photos', 'climb-photos', true)
on conflict (id) do nothing;

create policy "anyone can view climb photos" on storage.objects
  for select using (bucket_id = 'climb-photos');

create policy "users can upload to their own folder" on storage.objects
  for insert with check (
    bucket_id = 'climb-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete their own photos" on storage.objects
  for delete using (
    bucket_id = 'climb-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.get_friends()
returns table (friendship_id uuid, other_user_id uuid, display_name text, avatar_url text, status text, is_incoming boolean)
language plpgsql security definer
as $$
begin
  return query
  select f.id, p.id, p.display_name, p.avatar_url, f.status,
         (f.friend_id = auth.uid())
  from friendships f
  join profiles p on p.id = (case when f.user_id = auth.uid() then f.friend_id else f.user_id end)
  where f.user_id = auth.uid() or f.friend_id = auth.uid();
end;
$$;

-- Leaderboard RPC: returns each accepted friend's (plus your own) top
-- bouldering grade sent, ranked. Runs as security definer so it can read
-- across users' climbs for the leaderboard even though the base RLS
-- policies on sessions/climbs are locked to the row owner.
create or replace function public.get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, top_grade text, top_grade_rank int)
language plpgsql security definer
as $$
begin
  return query
  with grade_order as (
    select unnest(array['VB','V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10']) as grade, row_number() over () as rnk
  ),
  relevant_users as (
    select auth.uid() as uid
    union
    select friend_id from friendships where user_id = auth.uid() and status = 'accepted'
    union
    select user_id from friendships where friend_id = auth.uid() and status = 'accepted'
  ),
  best_per_user as (
    select s.user_id, max(go.rnk) as best_rank
    from sessions s
    join climbs c on c.session_id = s.id
    join grade_order go on go.grade = c.grade
    where s.user_id in (select uid from relevant_users)
      and s.discipline = 'boulder'
      and c.sent = true
    group by s.user_id
  )
  select p.id, p.display_name, p.avatar_url, go.grade, go.rnk::int
  from relevant_users ru
  join profiles p on p.id = ru.uid
  left join best_per_user bpu on bpu.user_id = ru.uid
  left join grade_order go on go.rnk = bpu.best_rank
  order by coalesce(go.rnk, 0) desc;
end;
$$;

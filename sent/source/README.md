# Sent (React Native)

The full React Native port of the original prototype (built under the name
"ClimbLog," later renamed to Sent), wired up end-to-end to Supabase for
auth, database, and photo storage.

## What's fully working

- **Offline queue** — writes made with no connectivity (start/end a
  session, add or delete a climb, delete a session, change a session's
  date) are saved locally and optimistically reflected in the UI
  immediately, then replayed against Supabase in order once connectivity
  returns. A session started offline gets a temporary id; every action
  that depends on it (its climbs, ending it) automatically resolves to the
  real id once the session itself syncs. A small banner at the top of the
  app shows "Offline" or "N changes waiting to sync." The query cache
  itself is also persisted to disk, so previously-loaded sessions are
  visible instantly on a cold launch even with zero signal.
- **Apple Sign In** (iOS) and **Google Sign In** are both wired into the
  login screen — see the Supabase dashboard setup steps below, since the
  provider configuration itself can't be done from code.
- **Home** — real session list (swipe-to-delete), live "this week" / "top
  grade" / "projects" stats (tap any of them to drill in), recent project
  climbs, discipline entry cards.
- **Gym picker** — the month-grid calendar for backdating a session, pick an
  existing gym or add a new one, both start the session immediately.
- **Logging** — grade selector, +/- attempts stepper, Next climb / Sent,
  camera capture that uploads to Supabase Storage (or queues the local file
  for upload during sync if you're offline), cancel-session confirmation.
- **Session summary → share** — after ending a session you land on a
  read-only summary with a grade pyramid, then can pick one sent climb to
  post to your friends' activity feed (or skip).
- **Session detail + edit mode** — from Home/Review/All sessions: view a
  past session, or tap Edit to change its date (calendar), add a climb (same
  popup as the logging screen), or swipe a climb left to delete it.
- **Projects** — full list, tap one to continue the route (starts a fresh
  session prefilled at that gym/discipline) or delete it.
- **Stats** — bouldering/top-rope toggle, four time-period pills, a small
  custom SVG line chart of your top grade sent per session.
- **Review** — week/month toggle, aggregate stats, combined "V5 / 5.9"
  style top-grade display, clickable session list.
- **Friends** — real leaderboard and activity feed via two Postgres RPCs
  (`get_leaderboard`, `get_friends`), add-a-friend by email (since a
  simulated QR scan doesn't map to a real backend — see note below), accept
  incoming requests, friend profile screen with a remove-friend confirm.
- **Profile** — editable display name (persisted to `profiles`), your gyms
  list with add-gym, a Support/Legal settings section, sign out.
- **Toasts** — the "Added to your projects" style toast, animated with
  Reanimated, available anywhere via `useToast()`.
- **Swipe-to-delete** — a shared `SwipeableRow` component (Gesture Handler +
  Reanimated) used for sessions and climbs, each gated by a confirm dialog.

## What changed from the web prototype's design, deliberately

- **QR add-friend → add-by-email.** The prototype's QR code was a visual
  mock with a "simulate scan" button — there's no real device-to-device
  pairing behind it. Real friend-adding needs *some* real identifier;
  email (via the `find_user_by_email` RPC) was the simplest real
  equivalent. A true QR flow is still possible later (encode a user ID in
  the code, scan it with `expo-camera`'s barcode scanner) but is a separate
  chunk of work.
- **Friend "this week" summary and "climbs shared" list** on the friend
  profile screen are stubbed with a code comment rather than faked — the
  prototype's version used deterministic mock data, which isn't meaningful
  once it's a real friend's real account. Building this for real needs
  either a broader RLS read policy or another RPC that aggregates a
  friend's recent sessions server-side.

## Setup

1. **Create a Supabase project**, then run `supabase/schema.sql` in the SQL
   editor. This creates every table, RLS policy, the photo storage bucket,
   and the three RPC functions (`get_leaderboard`, `get_friends`,
   `find_user_by_email`).
2. `cp .env.example .env` and fill in your project URL + anon key.
3. `npm install`
   > This project was scaffolded without access to Expo's version-
   > compatibility service, so run `npx expo install --check` once you have
   > normal internet access, before your first real build.
4. `npx expo start` — scan the QR with Expo Go, or press `i`/`a` for a
   simulator.
5. **Enable Apple Sign In** in Supabase: Authentication → Providers →
   Apple. You'll need an Apple Developer account, a Services ID, and a
   private key from developer.apple.com — Supabase's own Apple provider
   docs walk through generating these. Apple Sign In only works in a real
   dev/production build (not Expo Go), since it needs the native
   entitlement from `app.json`.
6. **Enable Google Sign In** in Supabase: Authentication → Providers →
   Google, with an OAuth Client ID + Secret from Google Cloud Console. Add
   `sent://auth-callback` as an authorized redirect URI both in Google
   Cloud Console and in Supabase's provider settings.

## Offline queue — how it works

`lib/offlineQueue.ts` holds a durable, ordered list of writes made while
offline, persisted to AsyncStorage. `lib/offlineSync.ts` replays them
against Supabase in order once `context/NetworkContext.tsx` reports
connectivity is back, driven by `components/OfflineSyncManager.tsx` mounted
near the root. The tricky part is a session created offline: it doesn't
have a real database id yet, so it gets a temporary one (`temp-...`)
immediately for the UI to use, and every subsequent queued action
referencing that session (climbs, ending it, changing its date) resolves
the temp id to the real one once the session's own insert has synced. If
you delete something that was created offline and never synced, the queue
simply cancels the actions that would have created it, rather than queuing
a delete against a row that never existed remotely.

What this doesn't yet handle: conflicting edits made from two devices while
both are offline (last-sync-wins, no merge), and gym creation isn't
offline-aware (adding a new gym requires connectivity — starting a session
at an *existing* gym is the scenario this was built for, since that's what
you'd actually do standing in a gym with bad signal).

## Known gaps / next steps

- **Push notifications** for the Notifications settings toggle (friend
  activity, session reminders) aren't wired to anything real yet.
- **Photo compression** before upload — currently uploads the full-quality
  capture; large images will be slow on real gym wifi.
- **Multi-device conflict resolution** for the offline queue — see above.

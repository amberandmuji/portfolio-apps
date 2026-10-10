@AGENTS.md

# Sent — project context for Claude Code

This file is read automatically by Claude Code on startup. It captures the
history and decisions from the chat session that built this app (web
prototype → this React Native rewrite), so you don't need to re-explain any
of it. The README covers setup and feature status — this file covers the
*why* behind the code and the gotchas that aren't obvious from reading it.

## What this app is

Sent is an indoor rock climbing session tracker (bouldering + top
rope). Log a session at a gym, log each climb's grade/attempts/sent-status
with a photo, review stats, and share sends with friends via a leaderboard
and activity feed.

## History: two prior phases before this codebase

1. **Web prototype** (React artifact, mock data, no backend). Used to
   nail down every screen, interaction, and animation through rapid
   iteration. Warm-orange Airbnb-inspired design system was finalized here.
2. **This React Native + Supabase app** — a full rebuild of that prototype
   with real auth, database, and storage. Not a demo; this is meant to
   become the actual App Store submission. See README's "Known gaps /
   next steps" for what's left before that's true.

Treat the prototype's UX decisions as the source of truth for *how features
should behave* when in doubt — this codebase is the faithful real
implementation of it, with a couple of deliberate deviations documented in
the README ("What changed from the web prototype's design, deliberately").

## Design system

- Colors, radii: `constants/theme.ts`. Primary accent is a warm burnt
  orange (`#CC4A08`) chosen specifically to pass WCAG AA contrast (4.5:1+)
  with white text — don't lighten it without re-checking contrast.
- Shared components, use these instead of re-inlining styles:
  - `components/BigRow.tsx` — the large icon-badge + title + big-stat-line
    row used for every session/project list in the app (Home, Projects,
    All Sessions, Review). If you add another list of sessions or climbs
    anywhere, use this, don't build a new row style.
  - `components/StatCard.tsx`, `components/Buttons.tsx` (PrimaryButton /
    SecondaryButton, both support `loading` and `icon` props) —
    used everywhere a stat tile or a filled/outlined button appears.
  - `components/Screen.tsx` — every single screen must be wrapped in this
    (not a bare `View`/`ScrollView`) or content renders under the status
    bar / notch. Tab screens use `edges={['top']}` (bottom is already
    handled by the tab bar); stack/modal screens use the default
    `edges={['top','bottom']}`.
  - `components/SwipeableRow.tsx`, `components/ConfirmSheet.tsx`,
    `components/MiniCalendar.tsx`, `components/AddClimbSheet.tsx` — all
    reused across multiple screens, don't duplicate.
- Type scale was deliberately bumped up one tier from initial values
  (12→14, 14→16, 18→21, etc.) partway through — if you add new text
  styles, match the *current* sizes you see in existing files, not smaller
  ones that might show up in old chat history/screenshots.

## Data layer

- `types/database.ts` is the source of truth for shapes — `Session`
  includes a `climbs: Climb[]` field (this was a real bug once: the type
  didn't declare it and the whole app was full of `as any` casts to work
  around it — don't reintroduce that).
- `hooks/useSessions.ts` is the most important file to understand: it's
  offline-aware. Every mutation checks `useIsOnline()` and either writes
  directly to Supabase or falls through to `lib/offlineQueue.ts`. Sessions
  created offline get a temp id (`temp-...`); use `useSessionById(id)`
  (not a raw `.find()`) anywhere you look up a single session by id from a
  route param, or it can go stale the moment that temp id resolves to a
  real one mid-session — this was a real bug, fixed once already.
- `supabase/schema.sql` is the full schema + RLS policies + three RPC
  functions (`get_leaderboard`, `get_friends`, `find_user_by_email`).
  Whenever you add a column or table, update this file (it's meant to be
  the complete, re-runnable source of truth) — and if you're editing an
  already-deployed Supabase project, remember schema.sql changes don't
  auto-apply; the user has to run the diff manually in the SQL editor.

## Environment gotchas (all hit and fixed once already — don't reintroduce)

- **Node must be ≥20.19.4.** Older LTS versions fail with an unsupported-
  version error from Expo's CLI.
- **`npm install` needs `--legacy-peer-deps`.** Expo's own `react-dom` peer
  dependency (pulled in for web-support tooling this app doesn't use)
  conflicts with the pinned `react` version otherwise.
- **`metro.config.js` must wrap with Reanimated's config helper**, or the
  bundler crashes with `Cannot read properties of undefined (reading
  'transformFile')`:
  ```js
  const { getDefaultConfig } = require('expo/metro-config');
  const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
  const config = getDefaultConfig(__dirname);
  module.exports = wrapWithReanimatedMetroConfig(config);
  ```
- **`expo-file-system`'s default export is broken for this SDK** —
  `readAsStringAsync` throws at runtime now. Import from
  `expo-file-system/legacy` instead (see `lib/uploadPhoto.ts`).
- **Apple Sign In crashes in Expo Go** (not a real build) — the native
  button component isn't in Expo Go's bundled modules. `app/login.tsx`
  already detects this via `expo-constants`'s `executionEnvironment` and
  hides the button there; don't remove that guard.
- If Metro ever throws the `transformFile` crash again *despite*
  `metro.config.js` being correct, it's very likely corrupted
  `node_modules` — full reset: `rm -rf node_modules package-lock.json
  .expo`, `npm cache clean --force`, reinstall, `npx expo start -c`.

## Calibration note on RN layout bugs

Two real, non-obvious React Native layout bugs were hit and fixed in this
codebase — worth knowing the pattern so you recognize it again:

1. **7-column grids with `width: '${100/7}%'` lose a column** to floating-
   point rounding in flexWrap layouts (`MiniCalendar.tsx` had this — a
   whole weekday column silently disappeared). Fix: build explicit rows of
   exact-count `flex: 1` children instead of relying on wrap + percentage
   widths for anything grid-like.
2. **Stat card rows with mismatched label line-counts look "broken"**
   when one card's label wraps to 2 lines — because RN's default
   `alignItems: 'stretch'` already equalizes sibling heights within a
   flex-wrap row, but content inside stays top-anchored unless you also
   set `justifyContent: 'center'` on the card itself.

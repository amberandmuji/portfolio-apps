# Sent

An indoor climbing session tracker for bouldering and top rope. Start a session at a gym, log each climb with a photo, grade, attempts and sent-or-project, review the session, then share a send with friends on a leaderboard and activity feed.

- **Demo:** `demo.mp4`, a 10-second 1080×1920 walkthrough of the main flow: start a session, pick a gym, log ten climbs, review, share.
- **Run it:** this is an Expo (React Native) app with a Supabase backend, so there is no browser build. See `source/README.md` for setup. Copy `source/.env.example` to `.env` and add your own Supabase URL and anon key.
- **Source:** `source/` (Expo Router, TypeScript, TanStack Query with an offline queue, Supabase auth, database and storage).

Features: guest, email, Apple and Google sign-in; offline logging that syncs when you're back online; route photos; project climbs you haven't sent yet; stats by period and discipline; a session calendar; friends, leaderboard and a shared send feed.

## Demo

| File | What it is |
| --- | --- |
| `demo.mp4` | The rendered 10-second video. |
| `demo/stage.html` | The animated phone mock-up and gradient backdrop, driven by a single timeline. |
| `demo/photos/` | The route photos used on screen. |
| `demo/record.js` | Playwright script that renders the page frame by frame to JPEGs. |
| `demo/encode.swift` | Encodes those frames to H.264 MP4 with AVFoundation (macOS). |

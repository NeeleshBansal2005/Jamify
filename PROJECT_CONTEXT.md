# Jamify project context

Last reviewed against the tracked code, PRD, and git history: 2026-10-20.

## Current implementation

Jamify is a React/Vite frontend in `Frontend/` and an Express/Socket.IO backend
in `Backend/`. The backend connects to MongoDB through Mongoose and opens a
Redis client during startup. Room state is stored in MongoDB; this repository
does not show Redis being used to read or write room state after connection.

The backend starts from `Backend/index.js`. It creates the HTTP and Socket.IO
servers, sets the Socket.IO manager instance, then connects MongoDB and Redis
before listening. The frontend calls the backend URL from `VITE_API_URL`, with
`http://localhost:5000` as its code fallback.

## Authentication

Authentication is custom email/password authentication, not Spotify OAuth.
`/auth/register` creates a bcrypt-hashed user; `/auth/login` sets HttpOnly
`accessToken` and `refreshToken` cookies; `/auth/refresh` rotates the stored
refresh-token hash; `/auth/logout` revokes the current refresh session and
clears both cookies. `AuthContext` loads `/auth/me` on startup, and `/discover`
and `/room/:id` are protected client routes.

API authentication uses the `accessToken` cookie. Socket.IO separately verifies
that cookie and records the authenticated user ID in `socket.data.userId`.

## Rooms and playback

`Room` contains `name`, `genre`, `vibe`, `host`, `members`, `currentTrack`,
`queue`, `isPlaying`, `playbackPosition`, and `playbackStartedAt`, plus Mongoose
timestamps. A track stores provider data (`provider`, `providerTrackId`,
`streamUrl`, title, artist, cover, duration), its server-derived `addedBy`, and
`addedAt`.

`currentTrack` is the playing track and `queue` contains upcoming tracks only.
Adding the first track makes it current and starts playback. `play`, `pause`,
and `skip` are authenticated host-only REST commands. Play and pause are safe
to retry when already in the requested state. Skip promotes the first queued
track or clears playback when the queue is empty.

The Room page joins through REST before opening its Socket.IO connection. The
server then authorizes `join-room` against `room.members`, sends a room
snapshot, and broadcasts room events to the Socket.IO room. Implemented events
are `room-joined`, `room-join-error`, `user-joined`, `queue-updated`,
`playback-started`, `playback-paused`, and `track-skipped`. Clients calculate a
late-join position from `playbackPosition` and `playbackStartedAt`.

## Music provider

The user-facing music flow calls `/music`, which normalizes JioSaavn-compatible
responses and fetches canonical track data before queue insertion. A separate
`/spotify/search` route is mounted, but the frontend does not call it. The
product and provider differences are recorded in `docs/GAPS.md`.

## Tests and current confidence

Playwright E2E specifications live in `Frontend/e2e/`. They configure isolated
MongoDB, Redis, and JWT inputs through `JAMIFY_E2E_MONGODB_URI`,
`JAMIFY_E2E_REDIS_URL`, and `JAMIFY_E2E_JWT_SECRET`; Playwright starts a local
WAV-capable music-provider stub, backend on port 5001, and frontend on port
5174. The tracked tests cover login, room membership, host-only playback,
play/pause, queue skip, and late joins using separate browser contexts.

The audit on 2026-10-20 inspected those tests but did not execute the E2E suite,
build, lint, or a running deployment. Test presence is not proof that the
implementation currently passes; execution status belongs in `docs/STATE.md`.

## Next reference points

- `README.md` will be the repository setup and operations guide.
- `docs/DECISIONS.md` records supported architecture decisions and evidence.
- `docs/STATE.md` distinguishes implemented paths from verified behavior.
- `docs/GAPS.md` records PRD, documentation, and implementation differences,
  plus unknowns that need confirmation before work proceeds.

Do not infer behavior from this summary when the relevant implementation is
available; inspect the listed source files first.

4. Authentication — COMPLETED

Authentication is already implemented.

Existing functionality:

user registration
password hashing with bcrypt
login
JWT access token
HttpOnly cookie
refresh token/session handling
refresh rotation/revocation
logout
authentication middleware
/auth/me
frontend AuthContext
protected routes
login persistence across refresh

Do not rebuild authentication.

Multi-user testing

Two browser tabs can still represent the same authenticated user because they share cookies.

For true multi-user testing:

Browser A
  -> User A account/session

Browser B / Incognito
  -> User B account/session

Then compare socket IDs and authenticated user IDs.

5. Room Model — ESTABLISHED

Rooms contain the concept of:

name
genre
vibe
host
members
currentTrack
queue
isPlaying

Members are represented as subdocuments containing a user reference and join timestamp.

Conceptually:

Room
 ├── host
 ├── members[]
 ├── currentTrack
 ├── queue[]
 ├── isPlaying
 ├── genre
 └── vibe
Track

A track contains provider/music metadata such as:

spotifyId
title
artist
cover
uri
duration
addedBy
timestamps

The exact schema in the repository is authoritative.

6. Queue Semantics — ESTABLISHED

The room follows:

currentTrack = currently playing track
queue = upcoming tracks

The currently playing track is NOT duplicated in queue.

When a queued track is promoted:

queue[0]
   ↓
currentTrack

and the promoted item is removed from the queue.

When there is no remaining queue after the current track finishes/skips:

currentTrack = null
isPlaying = false
7. Current Room APIs

Current room-related functionality includes concepts for:

GET  /rooms
GET  /rooms/:id

POST /rooms
POST /rooms/:roomId/queue
DELETE /rooms/:roomId/queue/:songId

POST /rooms/:id/play
POST /rooms/:id/pause
POST /rooms/:id/skip

POST /rooms/:roomId/join
POST /rooms/:roomId/leave

Exact middleware and implementation must always be checked in the current repository before modifying.

8. Socket.IO — COMPLETED / ACTIVE

Socket.IO is already integrated into the backend.

Frontend creates a Socket.IO connection with credentials.

The backend authenticates the socket using the HttpOnly access-token cookie.

Flow:

Socket connection
      ↓
read Cookie header
      ↓
extract accessToken
      ↓
jwt.verify(...)
      ↓
socket.data.userId

Room joining is separate:

join-room(roomId)
      ↓
find room
      ↓
check socket.data.userId against room.members
      ↓
authorized?
   ├── yes → socket.join(roomId)
   └── no  → reject/ignore

Room-specific broadcasts use:

io.to(roomId).emit(...)

The backend has a socket manager abstraction using:

setIo(io)
getIo()

setIo(io) must be called during server initialization before controllers use getIo().

Do not replace this architecture.

9. Current Real-Time Events

Existing synchronization uses events along the lines of:

queue-updated
user-joined
playback-started
playback-paused
track-skipped

Exact payloads must be checked in the current source before changing listeners.

The important principle:

Server changes authoritative state, then broadcasts the resulting state.

10. Playback — IMPLEMENTED

Playback is backend-controlled.

Any authenticated room member may use the shared play, pause, and skip
commands. The backend verifies membership before changing room state; the host
is not the sole playback controller.

Late joiners seek from `playbackPosition` and `playbackStartedAt`. If a browser
blocks automatic audio, the regular local Play control starts that listener at
the current server position without changing shared room state.

Play
Frontend
  POST /rooms/:id/play
        ↓
Backend checks room/currentTrack
        ↓
room.isPlaying = true
        ↓
MongoDB save
        ↓
Socket.IO playback event
        ↓
all room clients synchronize
Pause
Frontend
  POST /rooms/:id/pause
        ↓
Backend
  room.isPlaying = false
        ↓
MongoDB save
        ↓
Socket.IO playback event
        ↓
all room clients synchronize
Skip
POST /rooms/:id/skip
        ↓
queue available?
   ├── yes → promote queue[0]
   └── no  → clear currentTrack + stop
        ↓
broadcast updated state
Track End

Frontend requests /skip when the current track ends.

Backend decides whether to promote the next track or stop.

Clients do not independently invent the next room state.

11. Playback State Fix — RECENTLY COMPLETED

A previous issue produced:

400 {"error":"Already paused"}

when a repeated pause request was sent while the room was already paused.

Playback commands were made idempotent:

already playing + play → HTTP 200
already paused + pause → HTTP 200

Frontend playback was also improved to:

use room.isPlaying as the source of truth
remove separate stale isPlaying state
guard in-flight playback requests
check HTTP errors
update from server responses
synchronize queue/skip socket events
clean up socket connections/listeners
call /skip when a track ends

Verification completed:

frontend production build passed
Room.jsx ESLint passed
backend syntax check passed
repeated POST /pause returned HTTP 200 with isPlaying=false
12. Current Playback Testing

Single-user playback has been tested.

The next important verification is true multi-user synchronization.

Use:

Client A → User A account
Client B → User B account

Both join the same room.

Test:

A presses Play → both clients play.
B presses Pause → both pause.
A presses Play → both play.
Add another track to queue.
Skip → both move to the same track.
Let a track finish → both transition together.
Empty queue → both stop and currentTrack becomes null.

Important:

Different socket IDs do not necessarily mean different users.

Two tabs using the same login cookie can have:

socket A → User A
socket B → User A

True multi-user testing requires:

socket A → User A
socket B → User B
13. Current Frontend Room Page

Main room UI:

Frontend/src/pages/Room.jsx

It currently handles concepts including:

room loading
Socket.IO connection
room joining
real-time events
audio element
current track
play/pause
skip
queue operations
track-end handling

The actual current source code is authoritative.

Do not reintroduce a separate client isPlaying source of truth.

14. Relevant Backend Areas

Backend currently contains concepts such as:

Backend/
├── controllers/
│   └── roomsControllers.js
├── routes/
│   └── rooms.js
├── models/
│   └── Room.js
├── socket/
│   └── socketManager.js
├── database/
│   ├── db.js
│   └── redis.js
└── index.js

Exact filenames should be confirmed from the repository.

15. MongoDB / DNS History

The project previously experienced Windows/Node MongoDB Atlas DNS resolution issues involving:

querySrv ECONNREFUSED

A DNS workaround involving Node DNS configuration/public resolvers was used.

MongoDB connectivity was subsequently fixed/tested.

Do not change MongoDB connectivity configuration unless a new reproducible issue appears.

16. Redis

Redis is already connected as part of backend startup.

Do not redesign Redis usage just because the current playback feature does not depend heavily on it.

17. Architecture Decisions to Preserve
Decision 1

Jamify is not being built as a Spotify clone.

Decision 2

Backend is the source of truth for collaborative room state.

Decision 3

currentTrack means the currently playing track.

Decision 4

queue contains upcoming tracks only.

Decision 5

Socket.IO handles real-time propagation.

Decision 6

REST endpoints perform room/playback commands.

Decision 7

Authentication uses JWT + HttpOnly cookie + existing refresh/session system.

Decision 8

Do not rebuild working authentication or Socket.IO infrastructure.

Decision 9

Prefer incremental changes over large rewrites.

18. Current Project Status
Completed / Established
project foundation
React/Vite frontend
Express backend
MongoDB/Mongoose
Redis integration
user model
registration/login
JWT authentication
HttpOnly cookies
refresh/session handling
logout
/auth/me
protected frontend routing
room creation
room retrieval
room membership
Socket.IO server
Socket authentication
Socket room authorization
queue integration
currentTrack handling
playback endpoints
playback Socket.IO synchronization
idempotent play/pause behavior
track-end → server skip flow
Currently Being Verified
true two-user real-time playback synchronization
two-user room interaction
queue/skip synchronization across separate authenticated sessions
19. What Counts as Complete

A feature is not fully complete just because:

code compiles
build passes
endpoint returns 200

For real-time features, multiple clients should be tested.

For authentication features, different sessions/users should be tested.

For database changes, actual persisted behavior should be checked.

20. Maintaining This File

Update this file after meaningful milestones.

Good updates:

feature completed
API added
architecture decision changed
major bug fixed
current testing status changed
next milestone changed

Do NOT turn this into a diary of every debugging session.

Keep it focused on current truth.

If something becomes obsolete, replace the old information instead of leaving contradictory statements.

21. Next-Work Rule

Before starting a significant feature:

Read AGENTS.md.
Read PROJECT_CONTEXT.md.
Read the relevant PRD/product documentation.
Inspect the relevant source files.
Continue from the existing implementation.

Do not rebuild earlier systems from scratch.

22. E2E Testing Foundation

Playwright E2E tests live in `Frontend/e2e/` and use the real frontend,
Express backend, MongoDB, Redis, cookie authentication, Socket.IO, and music
provider. The suite creates distinct temporary User A/User B accounts and
opens them in separate browser contexts; it does not use two tabs sharing one
session.

Available commands from `Frontend/`:

`npm run test:e2e`
`npm run test:e2e:headed`
`npm run test:e2e:ui`

The suite requires `JAMIFY_E2E_MONGODB_URI`, `JAMIFY_E2E_REDIS_URL`, and
`JAMIFY_E2E_JWT_SECRET` to target isolated test-only infrastructure. Never run
the suite against the normal development database. See `Frontend/e2e/README.md`
for setup and the targeted realtime command.

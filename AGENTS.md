# AGENTS.md — Jamify Development Instructions

## 1. Project Identity

Jamify is a public, discoverable, real-time collaborative music platform.

Jamify is NOT a Spotify clone.

Spotify-inspired concepts may exist where useful, but do not redesign the product around copying Spotify.

The product direction is defined by the existing PRD, current codebase, and PROJECT_CONTEXT.md.

---

## 2. Source of Truth and Priority

Before making changes:

1. Inspect the relevant existing code.
2. Read this AGENTS.md.
3. Read PROJECT_CONTEXT.md.
4. Check the existing PRD/product documentation in the repository if present.
5. Preserve existing working architecture unless the user explicitly asks for a redesign.

Priority when information conflicts:

1. Explicit instruction from the user in the current task.
2. Existing PRD/product requirements.
3. Existing working code and established architecture.
4. PROJECT_CONTEXT.md.
5. General assumptions.

Do not invent product requirements.

If something is unclear, inspect the repository first. If it is still genuinely ambiguous and the choice would materially affect architecture, ask before making a large change.

---

## 3. Development Philosophy

The user is learning while building the project.

For non-trivial new concepts:

1. Explain what the concept is.
2. Explain why Jamify needs it.
3. Explain the relevant flow/architecture.
4. Identify the files that need to change.
5. Implement the smallest correct change.
6. Test it.
7. Report exactly what changed and what was verified.

For small bug fixes, do not force a long tutorial; explain the cause and fix concisely.

Do not paste large unrelated rewrites.

Prefer incremental, understandable changes over clever abstractions.

---

## 4. Architecture

### Frontend

- React
- Vite
- Existing UI/component structure
- Existing service modules for API communication
- Socket.IO client for real-time room synchronization

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- Socket.IO
- Redis where already implemented
- JWT authentication
- HttpOnly cookies

Do not replace these technologies without explicit instruction.

---

## 5. Backend Is the Source of Truth

Room state must be authoritative on the backend.

The important playback model is:

- currentTrack = the track currently playing
- queue = upcoming tracks only
- isPlaying = whether the current track is playing

Do not create competing client-side sources of truth for room playback state.

The frontend should reflect server state received through:

- initial REST API response
- REST mutation response
- Socket.IO events

Client UI state is acceptable for purely local UI concerns such as loading, modal visibility, selected filters, etc.

---

## 6. Room and Queue Model

The established room concept includes:

- name
- genre
- vibe
- host
- members
- currentTrack
- queue
- isPlaying

Tracks contain provider/music metadata such as:

- spotifyId
- title
- artist
- cover
- uri
- duration
- addedBy
- timestamps

Do not casually change the schema.

When changing schema or data semantics, first inspect all controllers, routes, frontend services/components, and socket consumers that depend on it.

Queue semantics:

- If there is no current track, adding the first track may make it the currentTrack.
- Additional tracks belong in queue.
- queue represents upcoming tracks, not the currently playing track.

---

## 7. Authentication

Authentication already exists.

Established pieces include:

- registration
- login
- bcrypt password hashing
- JWT
- HttpOnly access-token cookie
- refresh-token/session handling
- rotation/revocation
- logout
- authentication middleware
- /auth/me
- frontend auth context/protected routing

Do NOT rebuild authentication or introduce a second authentication architecture.

When adding a protected endpoint, use the existing authentication middleware and conventions.

Do not expose access/refresh tokens to frontend JavaScript unnecessarily.

---

## 8. Socket.IO Architecture

Socket.IO is already part of the backend architecture.

Established connection flow:

1. Frontend creates a Socket.IO connection with credentials.
2. Browser sends the HttpOnly cookie.
3. Backend Socket.IO middleware reads the cookie.
4. Access token is verified.
5. Authenticated user ID is stored in socket.data.userId.
6. Joining a room is a separate authorization step.
7. Only authorized members may join the Socket.IO room.
8. Room-specific events are emitted with io.to(roomId).

Do not create a second socket architecture.

The frontend should avoid creating multiple unnecessary sockets for the same Room page.

Socket listeners must be cleaned up when the component unmounts.

When debugging synchronization, distinguish:

- Socket.IO connection identity: socket.id
- authenticated application identity: socket.data.userId
- Jamify room ID

Two browser tabs can have different socket IDs while representing the same logged-in user.

To test two actual users, use two separate accounts/sessions.

---

## 9. Playback Synchronization

Playback is backend-controlled.

### Play

Frontend:

POST /rooms/:id/play

Backend:

1. validate room/current track
2. update isPlaying
3. save room
4. emit playback event to the Socket.IO room
5. return updated room

### Pause

Frontend:

POST /rooms/:id/pause

Backend:

1. validate room/current track
2. update isPlaying
3. save room
4. emit playback event
5. return updated room

### Skip

Frontend:

POST /rooms/:id/skip

Backend:

- if queue has another track, promote the first queued track to currentTrack, remove it from queue, and continue playback
- if queue is empty, clear currentTrack and stop playback
- save
- broadcast the resulting room state

### End of Track

The client should ask the backend to perform the skip/transition rather than independently inventing the next room state.

This keeps all clients synchronized.

---

## 10. Idempotent Playback Commands

Play/pause commands are intentionally safe to retry.

If the room is already in the requested state, returning the existing room with HTTP 200 is acceptable and preferred over treating the request as a fatal error.

The frontend should:

- prevent conflicting in-flight playback requests where appropriate
- check HTTP errors
- update from the server response
- continue treating room.isPlaying as the authoritative playback state

Do not reintroduce fragile duplicate-request behavior.

---

## 11. Existing Socket Manager

The backend already has a Socket.IO manager abstraction used by controllers, including the equivalent of:

- setIo(io)
- getIo()

Do not replace this with another global/socket architecture unless explicitly requested.

Ensure setIo(io) is called during server initialization before controllers need getIo().

---

## 12. REST + Socket Responsibilities

Use REST for commands/mutations where the existing architecture does so:

- create room
- join/leave room
- add/remove queue track
- play
- pause
- skip

Use Socket.IO for real-time propagation of resulting state/events to connected clients.

Do not make clients directly mutate authoritative room state.

---

## 13. API and Security

When adding or changing routes:

- inspect existing middleware usage
- protect user-specific mutations with the existing auth middleware
- validate room/user membership where appropriate
- return meaningful HTTP status codes
- do not expose secrets
- do not trust user-provided identity when authenticated identity is already available from the JWT

If an existing endpoint is currently unprotected but logically requires authentication, flag it before making a broad security change unless the user explicitly asks to secure it.

---

## 14. Error Handling

Do not hide backend errors.

Frontend API calls should check response status before assuming JSON represents success.

Backend errors should be consistent and understandable.

When debugging:

1. identify whether the problem is frontend, backend, database, socket, or browser/session state
2. reproduce
3. inspect logs/network/socket events
4. fix the root cause
5. retest

Do not paper over a state synchronization bug by simply adding local state changes.

---

## 15. Database Changes

MongoDB/Mongoose is already integrated.

Before changing a model:

- inspect existing schema
- inspect controllers using it
- inspect frontend payloads
- inspect socket events
- consider existing documents

Do not introduce migrations, collections, or duplicate fields without a concrete reason.

---

## 16. Redis

Redis is already part of the backend setup.

Do not remove or redesign the Redis layer merely because a particular feature does not currently need it.

If a new feature genuinely needs Redis, explain why before adding new usage.

---

## 17. Testing Expectations

After implementation, test the smallest relevant surface first.

For backend changes:

- syntax/startup
- endpoint behavior
- relevant database behavior
- socket behavior when applicable

For frontend changes:

- lint/build
- relevant UI flow
- browser/network behavior when applicable

For real-time features:

- test at least two connected clients
- distinguish same-user multi-tab testing from true multi-user testing
- for true multi-user testing, use two separate Jamify accounts/sessions

Do not claim something works unless it was actually verified or clearly state what was not tested.

---

## 18. Minimal-Change Rule

Do not rewrite working code just because another implementation is possible.

Before changing an existing subsystem, answer:

- What is currently working?
- What exact behavior is broken/missing?
- What is the smallest change that fixes it?
- What existing behavior could this change break?

Preserve established naming and folder conventions.

---

## 19. Codex Working Protocol

For every meaningful task:

### Step 1 — Inspect

Read the relevant files and understand current behavior.

### Step 2 — Plan

State:

- root cause/current behavior
- intended change
- affected files
- risks

### Step 3 — Implement

Make the smallest change that satisfies the requirement.

### Step 4 — Verify

Run relevant tests/build/lint/manual checks.

### Step 5 — Report

Tell the user:

- what changed
- why
- files changed
- verification result
- any remaining issue

Never silently make a large architectural change.

---

## 20. Documentation Maintenance

When a significant architectural decision, feature completion, or workflow change occurs, update PROJECT_CONTEXT.md.

Do not constantly rewrite the context file for trivial edits.

Keep PROJECT_CONTEXT.md concise enough that a developer can read it quickly.

If a decision becomes obsolete, replace the old decision rather than leaving contradictory instructions.

---

## 21. Do Not Assume

Never assume:

- a feature is still mock-based if it has already been connected to the backend
- authentication needs rebuilding
- Socket.IO needs rebuilding
- MongoDB needs replacing
- the PRD says something that has not been checked
- a frontend local state variable should control server-owned room state
- two browser tabs represent two different users
- a 200 response automatically means the entire real-time flow works

Inspect the code and verify.
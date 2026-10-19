# Jamify E2E tests

These tests use the real Jamify frontend, Express server, MongoDB, Redis,
Socket.IO, cookie authentication, and music endpoint. They do not target the
normal development database.

Before running the suite, set these PowerShell environment variables to an
isolated E2E-only MongoDB database and Redis instance:

```powershell
$env:JAMIFY_E2E_MONGODB_URI = "mongodb://127.0.0.1:27017/jamify-e2e"
$env:JAMIFY_E2E_REDIS_URL = "redis://127.0.0.1:6379"
$env:JAMIFY_E2E_JWT_SECRET = "a-long-random-test-only-secret"
```

The tests start the backend on `http://localhost:5000` and the frontend on
`http://localhost:5173`. They reuse already-running local servers by default;
only reuse servers that were started with the same isolated E2E environment.

Run all E2E tests:

```powershell
npm run test:e2e
```

Run only realtime playback tests:

```powershell
npm run test:e2e -- e2e/playback-sync.spec.js
```

Useful modes:

```powershell
npm run test:e2e:headed
npm run test:e2e:ui
```

The suite creates unique `@example.test` users through the existing register
and login endpoints. Its browser contexts are independent, so User A and User
B have different HttpOnly-cookie sessions. Playwright screenshots and traces
are retained on failure; reports and any stored auth state are ignored by Git.

The E2E provider is a local stub that returns deterministic track metadata and
a real ranged WAV stream. Playwright therefore verifies the browser's actual
`audio.currentTime` and playback state without depending on an external music
service.

# Design — Collaboration

Extends the Note model and adds a thin real-time + sync layer. Django stays the
source of truth for data; Supabase Realtime is an ephemeral presence/broadcast
sidecar the client talks to directly.

## Data model additions (Note)

| Field | Type | Purpose |
|-------|------|---------|
| `version` | `PositiveIntegerField` default 1 | optimistic concurrency (6.1) |
| `locked_by_session` | `CharField(64, null=True)` | advisory lock holder = **client session token** (5.1) |
| `lock_expires_at` | `DateTimeField(null=True)` | lock TTL 30s (5.3) |
| `id` | client-generatable **UUID** pk | offline create without id collisions |

> **Lock is per SESSION, not per user** (decided — see requirements Spec↔model
> conflict). Notes are owner-scoped (one owner), so "another editor" is the same
> user's other tab/device: the lock holder is a client-generated session token
> sent as the `X-Session-Id` header on `lock`/`heartbeat`/`unlock`/`PATCH`. A
> different session editing the same note id is blocked (423).

The application layer bumps `version` on every write. Locking + version live in
`notes` (the entity gains lock/version behaviour); the *sync + realtime + UI*
live here / in the frontend.

## API additions

| Method | Path | Body / notes | Success | Serves |
|--------|------|--------------|---------|--------|
| GET | `/api/health/` | – | 200 `{ok:true}` | heartbeat (1.1) |
| PATCH | `/api/notes/{id}/` | `{..., base_version}` | 200 Note (version+1) | 6.2 |
| POST | `/api/notes/{id}/lock/` | – | 200 `{locked_by, lock_expires_at}` or **423** | 5.1, 5.2 |
| POST | `/api/notes/{id}/lock/heartbeat/` | – | 200 (extends TTL) | 5.3 |
| POST | `/api/notes/{id}/unlock/` | – | 204 | 5.4 |
| GET | `/api/notes/?since={ISO}` | delta pull for sync | 200 `[Note]` | 3.1 |

- **409** (version mismatch) returns the current server note. **423** (locked)
  returns `{locked_by, lock_expires_at}`.
- Lock checks are enforced in the **application layer** inside
  `transaction.atomic()` + `select_for_update()` on the note row (this is the DB
  race-safety from `docs/ARCHITECTURE.md`, now doing real work): read-lock the
  row, verify version + lock, write, bump version, commit.

## Real-time (Supabase Realtime)

- Frontend `shared/api/realtime.ts` wraps `supabase-js` (anon key from
  `NEXT_PUBLIC_SUPABASE_*`). One channel per open note: `note:{id}`.
- **Presence** → Requirement 4 (who's here). **Broadcast** → notify others a lock
  was taken/released and that a new version was saved (so they refetch).
- Channel payloads carry only ids/usernames — never note content or secrets.
  Real authorization is Django's; Realtime is UX only.
- Alternative (all-Django, no client-side Supabase): Django Channels over ASGI +
  Redis. Heavier; use only if exposing the anon key is unacceptable.

## Offline + sync (frontend)

- `shared/lib/connectivity.ts` — online/offline signal from `navigator.onLine`
  plus a periodic `GET /api/health/`; exposes a store others subscribe to.
- `features/connection-status` — the indicator UI (1.2, 1.3).
- `features/offline-sync` — the **outbox**:
  - Persist pending mutations (create/patch/category) to IndexedDB (or
    localStorage) keyed by note id, each with `base_version` and a client op-id.
  - On reconnect: replay in order; on **409** reconcile (last-write-wins by
    `last_edited_at`, keep the losing copy, notify); ops are idempotent via op-id
    so partial replays don't duplicate.
  - Offline-created notes use a **client UUID** so the same id is used on the
    server (no remap needed) — the create is just a queued POST.
- `entities/note` store is the single cache the editor/board read from; the sync
  layer updates it. Optimistic edits apply locally first, then confirm on push.

## FSD placement

`shared/api/realtime.ts`, `shared/lib/connectivity.ts`,
`features/connection-status`, `features/offline-sync`, `features/note-lock`
(acquire/heartbeat/release + read-only UI). All network via `shared/api`;
`npm run arch` must stay green.

## Testing strategy
- Backend (application, DB): version bumps each write; PATCH with stale
  `base_version` → 409; lock acquire/heartbeat/expire/release; PATCH while locked
  by another → 423; all under `select_for_update` (concurrent-write test).
- `connectivity` (pure): transitions online↔offline from signals.
- `offline-sync` (pure/unit): outbox persists + replays; **idempotent** replay;
  409 → last-write-wins keeps the losing copy; offline create keeps its UUID.
- Realtime: presence add/remove (mock the supabase channel); lock broadcast
  flips the other client to read-only.
- Integration (MSW + fake realtime): edit offline → reconnect → note synced +
  "back online"; two editors → second sees read-only lock banner.

# Tasks — Collaboration

Enhancement layer — build **after** auth/notes/board are green. Test-first.
Sub-order: concurrency → offline → realtime (each independently shippable).

## Phase A — Optimistic concurrency + advisory lock (backend)

- [x] 1. `domain/`: Note gains `version`, `locked_by` (**session token**),
     `lock_expires_at`; `bump_version`, `acquire_lock(session,ttl)`, `refresh_lock`,
     `is_locked_by_other(session,now)`, `release_lock`. _Covers: 5.1,5.3,5.4,6.1_ ·
     _Tests: `test_note_lock.py`_
- [x] 2. `application/`: enforce lock (423) + version (409) in `update` under
     `transaction.atomic()`+`select_for_update()`; `lock`/`heartbeat`/`unlock` (TTL
     30s); `?since` delta. _Covers: 5.1–5.4, 6.2_ · _Tests: `test_note_concurrency.py`_
- [x] 3. migration (`0003`, session lock field); `interface/`: `base_version` on
     PATCH (→409 w/ current), `lock`/`heartbeat`/`unlock` (`X-Session-Id` → 423),
     `GET /api/health/`, `?since=`. _Covers: 3.1, 5.2, 6.2_ · _Tests: `test_collab_api.py`_

## Phase B — Offline-first (frontend)

- [x] 4. `shared/lib/connectivity.ts` (+ `session.ts`) + `features/connection-status`
  - `SyncBridge`. _Covers: 1.1–1.3_ · _Tests: `connectivity.test.ts`,
    `ConnectionStatus.test.tsx`_
- [x] 5. `features/offline-sync` outbox (localStorage persist, ordered replay,
     idempotent on op-id, 409 last-write-wins keeping the losing copy, client-UUID
     create) + editor wiring (base*version + session, offline enqueue, 409 reload).
     \_Covers: 2.1–2.3, 3.1–3.4* · _Tests: `outbox.test.ts`, `NoteEditor.test.tsx`_

## Phase C — Real-time presence + lock UI

- [x] 6. `shared/api/realtime.ts` (supabase-js behind a `RealtimeClient` port,
     no-op when `NEXT_PUBLIC_SUPABASE_*` is unset) + `features/note-presence`
     (present-session count) + `features/note-lock` (acquire on open, heartbeat,
     release on close, read-only banner on 423), wired into `NoteEditor`.
     _Covers: 4.1, 4.2, 5.2_ · _Tests: `realtime.test.ts` (no-op degrade),
     `usePresence.test.ts` (count add/remove + unmount leave),
     `useNoteLock.test.ts` (acquire/heartbeat/release, 423 → read-only)_

## Verification

- [x] 7. Traceability: every criterion (1.1–6.2) has ≥1 test naming its ID.
- [x] 8. `/verify` green (backend `lint-imports`, frontend `npm run arch`,
     coverage ≥ 85% — frontend 87.27%).
- [~] 9. Manual: the lock blocks a second session (backend 423 + read-only
  banner) and offline edits sync on reconnect. Presence needs a live Supabase
  project; it no-ops (count 0) without one.
- [x] 10. No note content/secrets flow over Realtime channels — presence
      payloads carry only session ids (`realtime.ts`).
- [x] 11. Open questions resolved (TTL 30s / heartbeat 10s, localStorage outbox,
      realtime-auth no-op default, client-generated UUIDs).

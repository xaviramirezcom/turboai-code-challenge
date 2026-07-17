# Requirements — Collaboration (offline-first + real-time locking)

## Introduction

Make editing robust when the network is unreliable and when more than one person
touches the same note. Three concerns: connection feedback, offline editing with
later sync, and real-time locking so two people don't silently clobber each
other. This is an **enhancement layer** over the core notes app — see the build
priority in `specs/OVERVIEW.md`. The core (auth/notes/board) must work first.

## The reconciliation rule (read this first)

Pessimistic locking assumes you're online; offline editing is optimistic. They
coexist under one rule:

- **Online:** opening a note acquires an advisory lock; other users see it as
  "being edited by X" and cannot edit until it's released (or the lock expires).
- **Offline:** you cannot hold or refresh a server lock, so offline edits are
  optimistic and queued. On reconnect they are pushed and **reconciled**; if the
  note changed elsewhere meanwhile, last-write-wins by `last_edited_at` and the
  user is told it changed elsewhere (the losing version is preserved locally).

## Sources of truth
- **Behaviour/data:** this spec. **Appearance** (indicators, lock banners,
  conflict notices): the Figma *(confirm — these states may not be in the demo;
  design pragmatic, minimal UI and flag them)*.

## Requirements

### Requirement 1 — Connection status feedback

1.1. THE SYSTEM SHALL detect connectivity (browser online/offline + a heartbeat
     to `GET /api/health/`) and reflect the current state in the UI.
1.2. WHEN the app goes offline, THE SYSTEM SHALL show a persistent "offline —
     changes saved locally" indicator.
1.3. WHEN connectivity returns, THE SYSTEM SHALL show a transient "back online —
     syncing…" then "synced" state.

### Requirement 2 — Offline editing with local persistence

2.1. WHILE offline, THE SYSTEM SHALL let the user read cached notes and create/
     edit notes, applying changes to local state immediately (optimistic).
2.2. WHILE offline, THE SYSTEM SHALL persist unsynced changes to local storage
     (an outbox) so they survive a reload.
2.3. THE SYSTEM SHALL record each queued change with the note id and the
     `base_version` it was made against (for reconciliation).

### Requirement 3 — Sync on reconnect

3.1. WHEN connectivity returns, THE SYSTEM SHALL flush the outbox: push each
     queued change, then pull the latest server state.
3.2. IF a pushed change's `base_version` no longer matches the server (someone
     else edited), THEN THE SYSTEM SHALL apply last-write-wins by `last_edited_at`
     and notify the user the note changed elsewhere, preserving the losing copy
     locally so nothing is silently lost.
3.3. WHEN the outbox is empty and the pull completes, THE SYSTEM SHALL clear the
     syncing state and reflect the reconciled notes.
3.4. THE SYSTEM SHALL make sync **idempotent** — replaying the outbox after a
     partial failure SHALL NOT duplicate notes or edits.

### Requirement 4 — Real-time presence

4.1. WHEN a user opens a note, THE SYSTEM SHALL announce presence on that note's
     real-time channel; other viewers SHALL see who is present.
4.2. WHEN a user leaves/closes the note or disconnects, THE SYSTEM SHALL remove
     their presence within the heartbeat interval.

### Requirement 5 — Advisory note lock (online)

5.1. WHEN an online user begins editing a note, THE SYSTEM SHALL acquire a lock
     (`locked_by` = user, `lock_expires_at` = now + TTL) if not already held by
     another unexpired lock.
5.2. IF another user holds an unexpired lock, THEN THE SYSTEM SHALL present the
     note read-only with "being edited by X", and a PATCH SHALL be rejected 423.
5.3. WHILE editing, THE SYSTEM SHALL refresh the lock via heartbeat before it
     expires; IF the client stops (crash/close), THE SYSTEM SHALL let the lock
     expire so the note becomes editable again (no permanent locks).
5.4. WHEN the user closes the note, THE SYSTEM SHALL release the lock immediately.

### Requirement 6 — Optimistic concurrency on write (always)

6.1. THE SYSTEM SHALL carry an integer `version` on each note, incremented on
     every server-side write.
6.2. WHEN a PATCH's `base_version` differs from the server's current version,
     THE SYSTEM SHALL respond 409 with the current note so the client can
     reconcile per the rule above.

## Open questions
- [x] Lock TTL + heartbeat interval. **Decided: TTL 30s, heartbeat 10s** (client
      refreshes at ~1/3 TTL; a stopped client's lock expires within 30s).
- [x] Local store: `localStorage` vs `IndexedDB`. **Decided: `localStorage`** (the
      spec's "simple, as requested" option) via a tiny typed wrapper — testable in
      jsdom and survives reload. Trade-off: for very many/large notes IndexedDB
      would scale better; the wrapper isolates the store so it can be swapped.
- [x] Realtime auth: **Supabase anon key** for Presence/Broadcast, **ids/usernames
      only** in payloads (never content/secrets); Django enforces real access.
      Wrapped behind a port that **no-ops when `NEXT_PUBLIC_SUPABASE_*` is unset**,
      so the app runs without Supabase Realtime configured.
- [x] Offline-created notes use a **client-generated UUID** (the Note pk is already
      UUID) so the same id is used on the server after sync — no remap.

## Spec ↔ model conflict (RAISED — needs a decision)

Requirement 5 (advisory lock, "being edited by X", 423) assumes a note can be
opened by **multiple editors**. But notes are **owner-scoped** — a note belongs
to one user; another user gets 404. With `locked_by = User`, a single owner can
never lock against themselves (two tabs = same user id), so the lock as specified
**never engages**. Requirement 6 (optimistic `version`) already protects the
realistic case (same user, two tabs/offline → 409). Decision pending (see below):
(1) per-**session** lock so a user's own two tabs block each other; (2) keep the
user lock as scaffolding (inert until note-sharing exists); (3) descope Req 5 +
Phase C, ship Req 6 + offline-first only.

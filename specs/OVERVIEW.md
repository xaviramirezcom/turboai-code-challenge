# Notes app — spec overview & build plan

Four specs derived from the walkthrough transcript + video frames
(`specs/raw_sources/`). Behaviour is fixed by the specs; **exact appearance is
confirmed against the Figma** (values marked *(confirm in Figma)*).

## Stack decisions (locked)

- **Backend:** Django + DRF, hexagonal (see `docs/ARCHITECTURE.md`).
- **Database:** **Supabase Postgres**, connected from Django via `DATABASE_URL`
  (django-environ). Supabase is the managed Postgres only — **not** Supabase
  Auth, **not** edge functions. Django owns auth and all business logic.
- **Auth:** Django + DRF token auth (Django `User` in the Supabase Postgres).
- **Real-time (collaboration only):** **Supabase Realtime** (Presence +
  Broadcast) from the frontend for "who's editing" + lock signalling — avoids
  standing up Django Channels/Redis. Django + a DB lock field is the enforcement.
  (Django Channels is the all-server alternative if exposing the Supabase anon
  key to the client is unacceptable.)
- **Frontend:** Next.js, Feature-Sliced Design (see `docs/FRONTEND_ARCHITECTURE.md`).

## Build order (PRIORITY — build top-down; each tier ships on its own)

Time management is graded, and the collaboration tier is large. Build and verify
in this order so the app is always in a shippable state:

**Tier 1 — MVP (the actual challenge). Do this first, fully.**
1. `specs/auth/` — signup, login, session, access control, seed 3 categories.
2. `specs/notes/` — Note+Category model on Supabase, instant create, autosave,
   last-edited, category colour, editor.
3. `specs/board/` — sidebar + counts, filtering, preview cards, relative dates,
   empty state.
→ At this point you have the complete notes app the video demonstrates. Commit,
   verify green, record the demo. **This is the safe deliverable.**

**Tier 2 — Offline-first** (`specs/collaboration/` Phases A6 + B): optimistic
`version` on writes, connection indicator, offline outbox, sync-on-reconnect with
last-write-wins. Independently valuable even without real-time.

**Tier 3 — Real-time locking** (`specs/collaboration/` Phases A + C): advisory
note lock (DB + TTL/heartbeat) and Supabase Realtime presence/lock UI.

Run each feature with `/spec-implement <feature>`; do Tier 1 in full before Tier 2.

## Shared data model (canonical in `specs/notes/design.md`)

- `User` (Django) → owns Categories and Notes.
- `Category`: name, color (hex), owner, is_default. Seeded: Random Thoughts,
  School, Personal.
- `Note`: **UUID id**, title, content (both may be empty), category, owner,
  created_at, last_edited_at (ordering `-last_edited_at`), **version**,
  **locked_by**, **lock_expires_at**.
- Everything owner-scoped: a user only ever sees their own data.

## Colour tokens (from frames — CONFIRM exact hex in Figma / via the Figma plugin)

cream bg `~#F4EEE2` · Random Thoughts peach `~#E7A67E` · School yellow `~#F3DCA0`
· Personal teal `~#8FB8AC`. Title = serif, body = sans-serif.

## Locking ↔ offline reconciliation (the one real tension)

Online = pessimistic advisory lock blocks other editors. Offline = you can't hold
a server lock, so edits are optimistic and queued; on reconnect they sync and, if
the note changed elsewhere, last-write-wins by `last_edited_at` with a
"changed elsewhere" notice (losing copy preserved). Full detail in
`specs/collaboration/requirements.md`.

## Consolidated open questions (decide as you implement)

- **Delete a note** — not in the demo; include for CRUD completeness or scope out?
- **Auth** — token (recommended) vs session/JWT; password policy (≥8); logout scope.
- **Autosave** — debounce interval + trigger (keystroke vs blur).
- **Card truncation** — content limit before ellipsis.
- **Counts** — respect active filter or always totals? (frames show totals)
- **Timezone** for today/yesterday — assume user-local.
- **Collaboration** — lock TTL/heartbeat (30s/10s), local store (IndexedDB vs
  localStorage), realtime-auth (anon key vs Django Channels), client UUIDs.

These live in each spec's `Open questions`; resolve there, keeping the spec the
source of truth.

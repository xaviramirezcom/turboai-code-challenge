# Design — Notes

Canonical data model for the app lives here (Note + Category); `auth` and `board`
reference it. Backend is hexagonal (see `docs/ARCHITECTURE.md`); frontend is FSD
(see `docs/FRONTEND_ARCHITECTURE.md`).

## Domain model (framework-free)

- **Note** (entity): `id`, `title: str`, `content: str`, `category_id`,
  `owner_id`, `created_at`, `last_edited_at`.
  - Invariant: a note always has a category (defaults on create).
  - Behaviour: `edit(title, content)` and `set_category(category_id)` both bump
    `last_edited_at`.
  - Note: title/content MAY be empty (created empty, filled later) — so empty is
    valid, unlike the generic template's non-empty-title example.
- **Category** (entity): `id`, `name`, `color`, `owner_id`, `is_default`.
- Ports: `NoteRepository`, `CategoryRepository`.

## Persistence model (infrastructure — Django ORM)

| Model | Fields | Notes |
|-------|--------|-------|
| `NoteORM` | **id `UUIDField` pk**, title `CharField(200, blank=True)`, content `TextField(blank=True)`, category `FK(CategoryORM)`, owner `FK(User)`, created_at `auto_now_add`, last_edited_at `DateTimeField`, **version `PositiveIntegerField` default 1**, **locked_by `FK(User, null)`, lock_expires_at `DateTimeField(null)`** | ordering `-last_edited_at` |
| `CategoryORM` | name `CharField`, color `CharField(7)` (hex), owner `FK(User)`, is_default `Bool` | unique (owner, name) |

`last_edited_at` is set explicitly by the service on edit (not `auto_now`), so
category-only changes and content edits both update it deterministically.

**Concurrency:** the `version`, `locked_by`, and `lock_expires_at` fields power
optimistic concurrency + advisory locking — behaviour, endpoints, and the
`select_for_update()` write path are defined in `specs/collaboration/`. The UUID
pk lets offline-created notes keep the same id after sync. The plain update use
case here is the online, single-editor path; collaboration wraps it with the
version/lock checks.

**Database:** Postgres, hosted on **Supabase**. Django connects via
`DATABASE_URL` (django-environ) — Supabase is used as the managed Postgres, not
Supabase Auth or edge functions. See `specs/OVERVIEW.md`.

## API contract (DRF, under `/api/`, auth required)

| Method | Path | Body | Success | Serves |
|--------|------|------|---------|--------|
| POST | `/api/notes/` | `{}` (optional client `id`, optional `category_id`) | 201 Note | 1.2 |
| GET | `/api/notes/{id}/` | – | 200 Note (404 if missing/not owned) | editor load |
| PATCH | `/api/notes/{id}/` | `{title?, content?, category_id?}` | 200 Note | 2.1, 2.2, 3.2 |
| GET | `/api/notes/?category={id}` | – | 200 `[Note]` | board (see board spec) |
| DELETE | `/api/notes/{id}/` | – | 204 owner · 404 missing/not owned | board 6.3 |
| GET | `/api/categories/` | – | 200 `[{id,name,color,is_default}]` | 3.1 (editor dropdown) + board sidebar |

Note shape: `{id, title, content, category_id, category: {id,name,color}, created_at, last_edited_at}`.
All endpoints scope to `request.user` (a user only ever sees their own notes).

## Application (use cases)
`NoteService`: `create(owner, category_id=None)`, `update(owner, note_id, title?, content?, category_id?)`
(sets `last_edited_at`, validates the category belongs to the owner), `get`, `list(owner, category_id?)`.
Each mutation publishes a domain event via the `EventPublisher` port → `EventLog`.

## Frontend (FSD)

| Piece | Layer/slice (segment) | States | Figma |
|-------|-----------------------|--------|-------|
| Note type, store, requests | `entities/note` (model/, api/) | – | – |
| NoteCard (preview) | `entities/note` (ui/) | – | <link> |
| Editor (title/content/category/close) | `features/edit-note` (ui/, api/) | idle, saving, error | <link> |
| Create-note action (+ New Note) | `features/create-note` (ui/, api/) | idle, creating | <link> |
| Category dropdown | `features/change-note-category` or `entities/category` (ui/) | – | <link> |

Autosave lives in the editor's `model/` hook: debounce (~500 ms *(confirm)*),
PATCH via the slice `api/`, coalesce in-flight edits, surface a "saving/saved"
affordance. Editor background = category colour (token from `entities/category`).

**Deferred creation (Requirement 1).** **+ New Note** does not `POST`. It
generates a client `id` (UUID) and opens the editor at `/notes/{id}?new=1`; the
editor starts as an empty in-memory draft (default category, placeholders) and
**does not fetch**. The draft persists on the first keystroke: the autosave flush
issues `POST /api/notes/` with that client `id` (201), then the normal PATCH
autosave continues. Sending the client `id` keeps the URL stable and makes the
create idempotent (a replayed create returns the existing note — reused from the
offline-sync path, collaboration 3.4). Once persisted, the editor drops `?new=1`
(history replace) so a reload loads the saved note instead of a fresh draft.
Closing/leaving a still-empty draft issues nothing (1.3). The `new=1` flag is
read once on mount, so the guard is `features/create-note` (opens the draft) +
`features/edit-note` (persists on first edit); no draft rows exist server-side.

## Colours (confirmed in Figma — exact hex)

App background cream `#FAF1E3`. Category colours (the solid border / dropdown-dot
colour; the **card and editor background render it at 50% alpha**):
**Random Thoughts `#EF9C66`** (frame 2:39), **School `#FCDC94`** (2:130),
**Personal `#78ABA8`** (2:118). Title font: **Inria Serif Bold**; body: **Inter**.

> Spec↔Figma reconciliation: the placeholder approximations (`~#E7A67E` etc.)
> were replaced with the exact frame hex above. These are the values seeded by
> `notes/domain/defaults.py`, so card/editor colours (3.3) match the design.

### Card & editor (frames 2:39 card, 2:8568 editor)
- Card: `bg = color@50%`, `3px solid color` border, radius 11px, shadow
  `1px 1px 2px rgba(0,0,0,.25)`, padding 16px, gap 12px. Header `date`
  (Inter Bold 12px) + `category` (Inter 12px); title Inria Serif Bold 24px;
  content Inter 12px, clamped with ellipsis.
- Editor: cream page; top bar = category dropdown (left) + close ✕ (right); the
  note card fills the width — last-edited (Inter 12px, right), title input
  (Inria Serif Bold 24px, placeholder "Note Title"), content textarea (Inter
  16px/27px, placeholder "Pour your heart out…"). Last-edited format:
  `Last Edited: July 21, 2024 at 8:39pm`.

## Testing strategy
- Domain: `edit()`/`set_category()` bump `last_edited_at`; empty title/content allowed.
- Application: create assigns default category + timestamps; update coalesces fields; rejects a category not owned by the user.
- Infrastructure: repository round-trip; ordering by `-last_edited_at`.
- Interface: POST 201 empty note; PATCH updates + bumps timestamp; cross-user access returns 404; DELETE 204 owner / 404 missing-or-not-owned.
- Frontend: **+ New Note** opens a draft without POSTing (1.1); the draft creates
  on the first keystroke then autosaves (1.2); closing an empty draft creates
  nothing (1.3); category change recolours; close returns to board.

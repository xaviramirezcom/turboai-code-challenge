# Design — <feature name>

<!--
The technical plan that satisfies requirements.md. Every design choice should
serve a numbered criterion. This is where the spec and the Figma are bound
together: link the exact frame that realizes each UI-bearing criterion.
-->

## Overview

<!-- The approach in a few sentences. How the pieces fit. -->

## Architecture

<!-- The flow across the hexagon for this feature (see docs/ARCHITECTURE.md).
Map each piece to a layer, e.g.:
  interface:      NoteViewSet + serializers  (HTTP ↔ command)
  application:    NoteService.create()       (use case + transaction)
  domain:         Note entity + invariants; NoteRepository port
  infrastructure: NoteORM, DjangoNoteRepository, DjangoUnitOfWork
Frontend (FSD): entities/note (model+api+ui) → features/<action> → widgets → views,
  with data through shared/api + the slice's api/ (never fetch in components).
Note which parts are new vs. reused. Remember: domain imports no framework. -->

## Domain model (framework-free)

<!-- Entities, value objects, invariants, and the repository port. This is the
behavior; the ORM shape below is how it's persisted. -->

## Persistence model (infrastructure — Django ORM)

<!-- ORM fields, types, constraints, defaults, ordering. Tie fields to criteria.
The repository maps this ↔ the domain entity. -->

| Field | Type | Constraints | Serves |
|-------|------|-------------|--------|
| id | int (pk) | auto | 1.1 |
| title | char(200) | required, non-empty | 1.1, 1.2 |
| body | text | optional | 1.1 |
| created_at | datetime | auto_now_add | 1.3 |
| updated_at | datetime | auto_now | 1.3 |

## API contract

<!-- The endpoints, one row per operation. Request/response shapes and status
codes must match the acceptance criteria exactly. -->

| Method | Path | Body | Success | Errors | Serves |
|--------|------|------|---------|--------|--------|
| POST | `/api/notes/` | `{title, body?}` | 201 `{id,title,body,created_at,updated_at}` | 400 `{title:[...]}` | 1.1, 1.2 |
| GET | `/api/notes/` | – | 200 `[Note,...]` (ordered `-updated_at`) | – | ... |

### Example request/response
```http
POST /api/notes/
{ "title": "Groceries", "body": "milk, eggs" }

201 Created
{ "id": 1, "title": "Groceries", "body": "milk, eggs",
  "created_at": "...", "updated_at": "..." }
```

## Frontend / UI (Feature-Sliced Design)

<!-- The FSD slice/layer/segment for each piece, server vs client, and the state
model. Data flows through shared/api + the slice's api/; components never call
fetch. CRITICAL: link the Figma frame for each screen/state — the Figma is
authoritative for appearance; this table is authoritative for structure + wiring.
See docs/FRONTEND_ARCHITECTURE.md. -->

| Piece | Layer/slice (segment) | States (loading/empty/error/…) | Figma frame | Serves |
|-------|-----------------------|-------------------------------|-------------|--------|
| Note type + store + requests | `entities/note` (model/, api/) | – | – | ... |
| NoteCard | `entities/note` (ui/) | – | <link> | ... |
| NoteList | `widgets/note-list` (ui/) | loading, empty, error, list | <link> | ... |
| Create form + mutation | `features/create-note` (ui/, api/) | idle, submitting, invalid | <link> | 1.1, 1.2 |
| Notes page | `views/notes` (ui/) rendered by `app/notes/page.tsx` | – | <link> | ... |

## Error handling

<!-- How errors surface at each layer: domain raises DomainError → application →
interface maps to DRF status/serializer errors → slice api/ → component error
state. Map to the IF/THEN criteria. -->

## Testing strategy

<!-- How each requirement will be proven, per layer. -->

- **Domain unit:** the invariant (e.g. empty title raises `EmptyTitle`) for 1.2;
  entity behavior for 1.3.
- **Application unit:** use case with in-memory fakes (no DB) — happy + failure.
- **Backend integration:** repository round-trip; `APIClient` POST for 1.1
  (happy) and 1.2 (400).
- **Frontend unit (`entities`/`shared`):** store/helpers/props-only components.
- **Frontend behavior (`features`):** create action calls the mocked api, shows
  submitting/invalid.
- **Frontend integration (`widgets`/`views`, MSW):** create flow renders the new
  note; API error shows the error state.
- Coverage floor `--cov-fail-under=85` (backend) / `--coverage` (frontend),
  enforced in CI + pre-commit.

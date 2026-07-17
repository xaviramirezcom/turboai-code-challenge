# Design — Board

Reuses the Note + Category model from `specs/notes/`. Read-heavy screen.

## Data / API

- **Categories with counts:** `GET /api/categories/` →
  `[{id, name, color, note_count}]`, scoped to `request.user`. The count is an
  annotated aggregate (`Count("notes")`), computed in the query — not per-row.
- **Notes list:** `GET /api/notes/?category={id}` (omit for all), ordered
  `-last_edited_at`, scoped to the user. Returns the Note shape from the notes
  spec (includes nested `category` for the card label + colour).

Date formatting (today/yesterday/month-day) is a **frontend** concern — the API
returns ISO `last_edited_at`; the client formats per Requirement 4. (Keeps the
API locale/timezone-neutral.)

## Application
`CategoryService.list_with_counts(owner)`; notes listing reuses `NoteService.list`.

## Frontend (FSD)

| Piece | Layer/slice (segment) | States | Figma |
|-------|-----------------------|--------|-------|
| Board page | `views/board` (ui/) rendered by `app/(app)/page.tsx` | loading, empty, list, error | <link> |
| Category sidebar + counts | `widgets/category-sidebar` (ui/, model/) | loading, active-filter | <link> |
| Notes grid | `widgets/note-grid` (ui/) | loading, empty, list | <link> |
| Preview card | `entities/note` (ui/ — NoteCard) | truncated/full | <link> |
| Filter state | `features/filter-by-category` (model/) | – | – |
| Relative date | `shared/lib/format-date.ts` | – | – |

- `format-date.ts` is pure and heavily unit-tested (the today/yesterday/month-day
  branches + the no-year rule are a classic bug magnet).
- The grid is masonry-style (variable card heights) *(confirm layout in Figma)*.
- Empty state is a state of `views/board`, driven by the notes list being empty
  for the active filter.

## Testing strategy
- `shared/lib/format-date`: today → "today"; yesterday → "yesterday"; older →
  "July 16" (no year); boundary at local midnight.
- `widgets/category-sidebar`: renders categories + counts; clicking sets the filter.
- `widgets/note-grid` (MSW): renders cards ordered by last-edited; truncates long
  content; empty filter → empty state; card click opens the editor.
- Backend: `GET /api/categories/` returns correct counts; `?category=` filters;
  both owner-scoped (another user's data never leaks).

# Design — Board

Reuses the Note + Category model from `specs/notes/`. Read-heavy screen.

## Data / API

- **Categories with counts:** `GET /api/categories/` →
  `[{id, name, color, note_count}]`, scoped to `request.user`. The count is an
  annotated aggregate (`Count("notes")`), computed in the query — not per-row.
- **Notes list:** `GET /api/notes/?category={id}` (omit for all), ordered
  `-last_edited_at`, scoped to the user. Returns the Note shape from the notes
  spec (includes nested `category` for the card label + colour).
- **Delete:** `DELETE /api/notes/{id}/` → **204** owner / **404** missing or not
  owned (defined in `specs/notes/`; the board is its UI entry point, Req 6).

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
| Preview card | `entities/note` (ui/ — NoteCard) | truncated/full, hover-✕ | <link> |
| Filter state | `features/filter-by-category` (model/) | – | – |
| Relative date | `shared/lib/format-date.ts` | – | – |

**Delete-from-card (Requirement 6).** `NoteCard` stays presentational: it renders
a hover/focus-revealed ✕ only when given an `onDelete` prop, and the ✕ handler
calls `stopPropagation()` so it never triggers the card's open-note click (6.3).
The action is coordinated by the grid + view (like the filter — widgets stay
presentational): `widgets/note-grid` runs a lightweight `window.confirm` (6.2),
calls `deleteNote(id)` (`entities/note` api), and on a successful 204 removes the
card optimistically (6.3) and keeps it on failure (6.5); `views/board` then
re-fetches the sidebar counts so the category and All-Categories totals decrement
(6.3). Not in Figma — the ✕ mirrors the editor's close ✕ (thin stroke, muted,
solid on hover), sized small and pinned to the card's top-right.

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
  both owner-scoped (another user's data never leaks); `DELETE` 204 owner / 404
  not-owned.
- `entities/note` NoteCard: shows the ✕ only with an `onDelete` prop; clicking ✕
  fires `onDelete` and does NOT fire the card's open handler (stopPropagation).
- `widgets/note-grid` (delete): confirm→delete removes the card and calls back to
  the view; a cancelled confirm or a failed delete leaves the card in place.
- `views/board`: after a delete, the sidebar counts re-fetch and decrement.

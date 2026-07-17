# Tasks — Board

Test-first, per layer.

## Backend

- [x] 1. `application/`: `CategoryService.list_with_counts(owner)` (annotated
     aggregate). _Covers: 1.1, 1.2_ · _Tests: `test_note_repository.py` (DB),
     `test_board_api.py`_
- [x] 2. `interface/`: `GET /api/categories/` (with counts) + `?category=` filter
     and `-last_edited_at` ordering. _Covers: 1.1, 1.2, 2.1, 2.2, 3.5_ ·
     _Tests: `test_board_api.py` (counts; filter; ordering; owner-scoped)_

## Frontend — FSD slices

- [x] 3. `shared/lib/date.ts` `formatRelativeDate` (pure). _Covers: 4.1, 4.2, 4.3_
     · _Tests: `date.test.ts` (today/yesterday/older no-year, midnight boundary)_
- [x] 4. `widgets/category-sidebar`: All Categories + dots + counts; sets active
     filter. _Covers: 1.1, 1.2, 2.1–2.3_ · _Figma: 2:388_ · _Tests:
     `CategorySidebar.test.tsx`_
- [x] 5. `entities/note` NoteCard: date + category + title + truncated content,
     category-coloured. _Covers: 3.1, 3.2, 3.3_ · _Figma: 2:39_ · _Tests:
     `NoteCard.test.tsx`_
- [x] 6. `widgets/note-grid` + `views/board`: masonry grid ordered by last-edited,
     empty state, card → editor; filter held in the view. _Covers: 3.4, 3.5, 5.1_ ·
     _Figma: 1:2 / 12:486_ · _Tests: `NoteGrid.test.tsx`, `BoardView.test.tsx`_

## Verification

- [x] 7. Traceability: every criterion (1.1–5.1) has ≥1 test naming its ID.
- [x] 8. `/verify` green (`npm run arch`; backend 98%+, frontend 95.7% coverage).
- [~] 9. Board diffed against Figma (sidebar 2:388, empty 12:486, cards 2:39):
  colours/spacing/masonry matched; **empty-state boba illustration must be
  downloaded** (public/board/empty-boba.png — sandbox blocks the fetch).
- [x] 10. Resolved count-respects-filter (totals) + truncation (CSS clamp) +
      timezone (user-local) open questions.

Note (Figma vs spec, minor): the filter state lives in `views/board` (useState)
rather than a separate `features/filter-by-category` slice — the widgets stay
presentational and the view coordinates the filter (valid FSD). The empty-state
frame omits per-category counts; per spec 1.2 counts always show (0 when empty).

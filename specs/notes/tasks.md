# Tasks — Notes

Test-first, per layer. Each task names the criteria it covers.

## Backend — hexagonal slice

- [x] 1. `domain/`: `Note` + `Category` entities, invariants, `edit`/`set_category`
     bumping `last_edited_at`; `NoteRepository` + `CategoryRepository` ports.
     _Covers: 1.2, 2.2, 3.2_ · _Tests: `test_note_entity.py`_
- [x] 2. `application/`: `NoteService` (create/update/get/list/delete) + commands;
     publish events; validate category ownership; `CategoryService.list/get`.
     _Covers: 1.1, 2.1, 3.2, delete_ · _Tests: `test_note_service.py` (fakes)_
- [x] 3. `infrastructure/`: `NoteORM` (UUID pk + version/lock) + migration, mappers,
     repositories (`select_for_update`), `DjangoUnitOfWork`, clock/events adapters.
     _Covers: 1.1, 1.2, 2.2_ · _Tests: `test_note_repository.py` (DB)_
- [x] 4. `interface/`: serializers + `Notes`/`NoteDetail`/`Categories` views + routes
     (`POST/GET/PATCH/DELETE /api/notes/`, `GET /api/categories/`), owner-scoped.
     _Covers: 1.1, 2.1, 2.2, 3.1, 3.2, 4.1, delete, 5.1, 5.2_ · _Tests: `test_notes_api.py`_

## Frontend — FSD slices

- [x] 5. `entities/note` + `entities/category`: types, `api/` on `shared/api`,
     `NoteCard`. _Covers: API contract, 3.3_ · _Tests: `note.test.ts`,
     `category.test.ts`, `NoteCard.test.tsx`, `date.test.ts`, `color.test.ts`_
- [x] 6. `features/create-note`: **+ New Note** opens an empty draft editor at a
     client `id` (`/notes/{id}?new=1`) WITHOUT persisting — no `POST`.
     _Covers: 1.1_ · _Figma: board button_ · _Tests: `CreateNoteButton.test.tsx`
     (navigates to a draft url; issues no create)_
- [x] 7. `features/edit-note`: editor (title/content/category/close), debounced
     (~500ms) coalescing autosave, category-colour background, last-edited display;
     **deferred creation** — a draft persists (`POST`) on the first keystroke then
     autosaves, and an empty draft closed persists nothing; drops `?new=1` once
     saved. _Covers: 1.2, 1.3, 1.4, 2.1–2.4, 3.1–3.3, 4.1_ · _Figma: frames 2:8568
     (editor) / 2:39 (card)_ · _Tests: `NoteEditor.test.tsx`, `useNoteEditor.test.ts`
     (draft creates on first edit; empty draft creates nothing)_

## Verification

- [x] 8. Traceability: every criterion (1.1–1.4, 2.1–4.1, 5.1–5.2) has ≥1 test
      naming its ID.
- [x] 9. `/verify` green (backend `lint-imports`/98.3%, frontend `npm run arch`/96%).
- [x] 10. Editor diffed against Figma frames 2:8568/2:39; exact colours + Inria
      Serif/Inter confirmed; category-colour discrepancy reconciled (see design.md).
- [x] 11. Delete note — decided **in** (`DELETE /api/notes/{id}/`, `NoteService.delete`,
      `deleteNote` client). Recorded in requirements → Open questions.

# Tasks — <feature name>

<!--
An ordered, test-first implementation checklist derived from design.md. Each
task is small, independently verifiable, and names the criteria it satisfies.
The LLM works these top to bottom via /spec-implement. Check them off as they
land (with tests green).

Rules:
- Every task that adds behavior includes writing the test(s) FIRST.
- Every task references the acceptance-criteria IDs it covers.
- Keep tasks to a single reviewable slice each.
-->

## Backend — hexagonal slice, inside-out (see docs/ARCHITECTURE.md)

- [ ] 1. `domain/`: `Note` entity + invariants (e.g. empty title → `EmptyTitle`)
  and the `NoteRepository` port. _Covers: 1.2, 1.3_ · _Tests (pure, no DB):
  invalid title raises; valid holds_
- [ ] 2. `application/`: command DTO + use case on `NoteService`; publish a
  domain event via the `EventPublisher` port. _Covers: 1.1, 1.2_ · _Tests
  (in-memory fakes, no DB): happy path + each failure path_
- [ ] 3. `infrastructure/`: `NoteORM` + migration, `mappers`, repository impl
  (`select_for_update` where a real race exists), `DjangoUnitOfWork`.
  _Covers: 1.1, 1.3_ · _Tests (real DB): repository round-trips; NoteNotFound_
- [ ] 4. `interface/`: DRF serializer (shape only) + viewset + route under
  `/api/notes/`; wire adapters in `container.py`. _Covers: 1.1, 1.2_ · _Tests
  (APIClient): POST 201, GET 200 ordered, empty title → 400, count unchanged_

## Frontend — FSD slices (see docs/FRONTEND_ARCHITECTURE.md)

- [ ] 5. `entities/note`: `model/` (type + store/hooks), `api/` (typed requests
  on `shared/api`, types mirror the serializer), a `NoteCard` in `ui/`; export
  via `index.ts`. _Covers: API contract_ · _Tests: api maps response to typed Note_
- [ ] 6. `features/create-note`: form (`ui/`) + mutation (`api/`) matching the
  Figma create frame. _Covers: 1.1, 1.2_ · _Figma: <link>_ · _Tests: submit calls
  the mocked api; invalid shows error_
- [ ] 7. `widgets/note-list` + `views/notes` (rendered by `app/notes/page.tsx`):
  loading / empty / error / list states. _Covers: <ids>_ · _Figma: <link>_ ·
  _Tests (MSW): renders list; empty state; error state_

## Verification

- [ ] 8. Traceability pass: every acceptance criterion has ≥1 test naming its ID.
- [ ] 9. `/verify` green on both apps: lint, types, **lint-imports** (backend) /
      **npm run arch** (frontend), tests, coverage ≥ 85%.
- [ ] 10. UI diffed against the linked Figma frames; discrepancies resolved or
      logged in requirements.md → Open questions.
- [ ] 11. `code-reviewer` pass clean (spec conformance, boundaries, no scope creep).

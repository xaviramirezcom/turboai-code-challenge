# Turbo AI Notes App — Project Memory

This file is loaded into Claude Code at the start of every session. Keep it
short, specific, and verifiable. Reference material lives in `.claude/skills/`
and path-scoped conventions live in `.claude/rules/` so this file stays lean.

## What we're building

A notes-taking app for the Turbo AI hiring challenge. It must match the Figma
prototype and be built with the required stack:

- **Backend:** Django + Django REST Framework, exposing a JSON API.
- **Frontend:** Next.js (App Router) + React + TypeScript.
- **Database:** Supabase Postgres (Django connects via `DATABASE_URL`) — managed
  Postgres only, not Supabase Auth/edge functions. Django owns auth + logic.
- **Monorepo layout:** `backend/` (Django) and `frontend/` (Next.js).

The graders explicitly evaluate: functionality, code quality + test coverage,
creativity/effective AI use, and time management. Optimize for a clean,
well-tested, reviewable submission over feature sprawl.

## Start here (when told "go")

The full, priority-ordered build plan is `specs/OVERVIEW.md`. Build **Tier 1
(MVP: auth → notes → board) in full and verify it green before** starting Tier 2
(offline-first) or Tier 3 (real-time locking) in `specs/collaboration/`. Do one
feature at a time with `/spec-implement <feature>`, committing after each. Tier 1
is the safe, complete deliverable the video demonstrates; the collaboration tiers
are additive. Resolve a spec's Open questions before closing it; if the Figma is
connected (Figma plugin), pull exact tokens/frames to fill the *(confirm in
Figma)* placeholders.

## How we work: spec-driven, two sources of truth

This project is built **spec-first**. Features live under `specs/<feature>/`
(requirements + design + tasks). Implement with the `/spec-implement` skill:
read the spec, derive tests from its numbered acceptance criteria, then write
the code. Behavior traces to a criterion — nothing is built that the spec didn't
ask for.

Two documents are authoritative and **neither overrides the other**:

- **The spec** owns *behavior, data, and API* — what happens, what's stored,
  what the endpoints return, which states exist and what triggers them.
- **The Figma** owns *appearance* — layout, spacing, type, color, and how each
  state (loading/empty/error) looks. `design.md` links the exact frame per
  UI-bearing criterion.

If the spec and the Figma ever disagree, **do not silently pick one.** Record it
in `requirements.md` → Open questions and raise it. See `specs/README.md`.

## Tests are a contract

A failing test means the CODE is wrong, not the test. To make a test pass you
change the implementation — never weaken the test. Specifically, NEVER:
delete or comment out a test, add `@pytest.mark.skip`/`xfail`/`.only`/`it.skip`,
loosen or remove an assertion, replace the thing under test with a mock, add
`# type: ignore`/`@ts-ignore`/`eslint-disable` to silence an error, or lower a
coverage threshold. These are blocked by a hook and checked in review and CI; if
one seems truly warranted, stop and ask the human to make that change.

## Golden rules

1. **Tests are not optional.** Every backend endpoint and every non-trivial
   frontend component ships with unit tests, and cross-layer slices ship with
   integration tests, in the same change. If you add behavior without a test,
   you are not done.
2. **Small, reviewable changes.** Prefer a working vertical slice (domain →
   application → infrastructure → interface → UI, with tests at each layer) over
   broad half-finished layers.
3. **Never invent requirements.** Build only what a numbered acceptance
   criterion asks for. If the spec is ambiguous, or the spec and Figma conflict,
   STOP and flag it under `requirements.md` → Open questions — don't guess. If
   something genuinely needed is unspecified, add it to the spec first, then
   implement.
4. **Type everything.** No `any` in TypeScript, no untyped public functions in
   Python. Type checks must pass (`mypy`, `tsc --noEmit`).
5. **Keep secrets out of git.** Never read or write `.env*` files or hardcode
   credentials. Use `django-environ` / `.env.example` with placeholders.
6. **Everything is logged.** Every request, every domain mutation, and every
   error becomes a queryable DB row (see below). Never log secrets/PII — redact
   them. Never DELETE log rows.
7. **Document AI usage as you go.** The README must explain how AI tools were
   used — keep `docs/AI_USAGE.md` updated when you rely on generation.

## Commands (source of truth — keep these working)

Backend (run from `backend/`):

- Install: `pip install -r requirements.txt`
- Dev server: `python manage.py runserver`
- Migrate: `python manage.py makemigrations && python manage.py migrate`
- Lint + format: `ruff check . && ruff format --check .`
- Type check: `mypy .`
- Architecture boundaries: `lint-imports` (hexagonal dependency rule)
- Tests + coverage: `pytest --cov=. --cov-report=term-missing`
- Django sanity: `python manage.py check`

Frontend (run from `frontend/`):

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Type check: `npm run typecheck` (`tsc --noEmit`)
- Architecture boundaries: `npm run arch` (FSD, dependency-cruiser)
- Tests: `npm test` (Vitest + React Testing Library)

## Definition of done for any task

- [ ] Code compiles / type-checks with zero errors.
- [ ] Linter and formatter are clean.
- [ ] New behavior is covered by tests, and the full suite passes.
- [ ] No secrets, no debug prints/`console.log` left behind.
- [ ] Public-facing changes reflected in the README if relevant.

## Architecture conventions

Backend is a **DDD / hexagonal modular monolith** (full reference:
`docs/ARCHITECTURE.md`). Dependencies point inward —
`interface → application → domain` — and the **domain imports no framework**.
This rule is enforced by `import-linter` (`backend/.importlinter`, run as
`lint-imports` in `/verify`, CI, and pre-commit); violating it fails the build.

- The `notes/` bounded context has four layers: `domain/` (entities,
  invariants, repository ports — pure Python), `application/` (use cases,
  commands, `UnitOfWork`/`EventPublisher` ports), `infrastructure/` (ORM models,
  repository + UoW adapters — where `transaction.atomic()` + `select_for_update()`
  live), `interface/` (DRF serializers/views), plus `container.py` (wires
  adapters to ports). `observability/` is a flat cross-cutting **support module**
  (logging is infrastructure by nature), not a four-layer context.
- ORM models are persistence only, in `infrastructure`; repositories return
  domain entities, never ORM objects. Business rules live in the domain.
- Backend API versioned under `/api/`; views are thin (HTTP ↔ command).

Frontend is **Feature-Sliced Design** (full reference:
`docs/FRONTEND_ARCHITECTURE.md`). Layers `app → views → widgets → features →
entities → shared` import one-way (only downward), and cross-slice imports go
through a slice's public `index.ts`. Enforced by `dependency-cruiser`
(`frontend/.dependency-cruiser.cjs`) via `npm run arch` in `/verify`, CI, and
pre-commit. The base HTTP client lives in `shared/api`; each slice's `api/` wraps
it — components never call `fetch` directly. Next's `app/` is routing only; FSD's
`pages` layer is renamed `views` under `src/`.

## Observability: the DB is the operational log

Every request, domain event, and error is a queryable row (`observability` app:
`RequestLog`, `EventLog`, `ErrorLog`), correlated by a per-request `request_id`,
with secrets redacted and rows never deleted. Domain mutations are recorded from
the service layer via `log_event(...)` — no triggers/hidden signals. Spec +
reference implementation: `specs/observability/`; conventions:
`.claude/rules/observability.md`.

## Agentic auto-fix from logs (dev-time, PR-gated)

Because failures are self-describing rows, an agent can fix code from the DB
alone. Use the `/triage-logs` skill: `logs_report` → reconstruct the failing
request → reproduce with a failing test → fix the code → `logs_resolve` (append,
never delete) → `/verify` → open a PR for review. This loop works in the repo
against a dev/test DB; it never mutates a running system, and the PR (via `gh`,
which is in the `ask` list) is the human gate.

## Detailed conventions

Path-scoped rules load automatically when you touch matching files:

- `.claude/rules/backend.md` — Django/DRF conventions
- `.claude/rules/frontend.md` — Next.js/React conventions
- `.claude/rules/observability.md` — logging / DB-as-log conventions (backend)
- `.claude/rules/specs.md` — how to write/consume specs (loads on `specs/**`)

Reusable workflows are skills (`/spec-implement`, `/django-endpoint`,
`/react-component`, `/test-driven`, `/integration-test`, `/triage-logs`,
`/conventional-commit`, `/verify`). Start feature work with `/spec-implement`;
fix errors from the logs with `/triage-logs`.

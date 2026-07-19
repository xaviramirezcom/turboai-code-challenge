# Turbo AI — Full-Stack Notes App

A notes-taking app built for the Turbo AI Senior Full-Stack challenge:
Django + DRF backend, Next.js + React + TypeScript frontend, Supabase Postgres.

- **Repo:** <your-github-url>
- **Demo video (5 min):** <your-video-url>
- **Live demo:** https://99ab-2800-bf0-177-177-cf9-a906-4b1d-76f8.ngrok-free.app
  (API: https://165f-2800-bf0-177-177-cf9-a906-4b1d-76f8.ngrok-free.app/api) —
  temporary ngrok tunnels to a local dev stack; they only resolve while it's
  running. To run it yourself, see [Running it locally](#running-it-locally).

---

## The app

A personal notes app that matches the walkthrough and Figma design:

- **Auth** — signup / login with a password-visibility toggle; each user's data is
  private. Three categories (Random Thoughts, School, Personal) are seeded on signup.
- **Notes** — a note is created the moment you start typing (no save button); title,
  content, and category autosave, and a live "last edited" timestamp updates as you write.
- **Category colour** — changing a note's category recolours it; the editor and the
  preview cards take on the category's colour.
- **Board** — a category sidebar with per-category counts, filtering (All / by
  category), preview cards with truncated content, an empty state, and relative dates
  ("today" / "yesterday" / month-day, no year).
- **Delete** — a hover ✕ on each card removes a note.

The **collaboration tier** (offline-first editing with sync, and real-time note
locking via Supabase Realtime) is specced and built as an additive layer on top of
the core — see *Prioritisation* below.

## Tech stack

Django 5 · Django REST Framework · Supabase Postgres (SQLite locally/CI) · Next.js
(App Router) · React · TypeScript · Vitest + React Testing Library · pytest · ruff ·
mypy · import-linter · dependency-cruiser · GitHub Actions.

---

## My process

I treated this less as "write an app" and more as "set up an AI to write a great app,
then drive it." Three phases:

### 1. Build the environment before the app

Before a line of feature code, I set up everything the AI needed to produce clean,
consistent, well-tested code and *stay* inside the rails:

- A lean `CLAUDE.md` (project memory), path-scoped rule files (backend, frontend,
  observability, specs), and reusable **skills** (`/spec-implement`, `/django-endpoint`,
  `/react-component`, `/test-driven`, `/integration-test`, `/triage-logs`,
  `/conventional-commit`, `/verify`).
- **Enforced guardrails**, not just guidelines: pre-tool hooks that block
  test-weakening edits (adding `skip`/`xfail`, deleting assertions, lowering the
  coverage floor) and dangerous shell commands; auto-format on save; a coverage floor;
  a CI workflow and a pre-commit gate.
- **Architecture as a rule the build enforces**: `docs/ARCHITECTURE.md` (backend) and
  `docs/FRONTEND_ARCHITECTURE.md` (frontend), backed by `import-linter` and
  `dependency-cruiser` so a boundary violation fails the build.
- A **spec-kit template** (`requirements.md` / `design.md` / `tasks.md`) so every
  feature is specified before it's implemented.

### 2. Turn the brief into specs

The requirements live in a walkthrough video and a Figma file, so I converted both
into machine-usable specs:

- I wrote a small utility (`tools/transcribe/`) that extracts the audio with **ffmpeg**
  and transcribes it with the **OpenAI Speech-to-Text API** — that transcript is the
  authoritative source for *behaviour*.
- To keep the visual demo context the transcript loses, I extracted **keyframes from
  the video** (ffmpeg, aligned to the transcript's timestamps) so the AI could see what
  each screen looked like as it was described.
- From the transcript + frames, I authored **spec-kit specs** for each feature (`auth`,
  `notes`, `board`, `collaboration`) — user stories, numbered **EARS** acceptance
  criteria, a design (data model, API contract, layer mapping), and a test-first task
  list. Exact visual tokens are pulled from the **Figma** (the source of truth for
  appearance) via the Figma plugin.

### 3. Implement with Claude Code

I implemented feature by feature with **Claude Code**, running `/spec-implement <feature>`
in priority order (auth → notes → board → collaboration). Each run reads the spec,
writes tests from the acceptance criteria **first**, implements to pass them, and every
change is checked by the guardrails (lint, types, `import-linter`, `dependency-cruiser`,
coverage). Nothing merges that drifts from the spec or breaks a boundary.

---

## Key design & technical decisions

**Spec-driven development, two sources of truth.** Behaviour is fixed by the spec;
appearance by the Figma. Every acceptance criterion maps to at least one test that
names it (`# covers 1.2`), so functionality is traceable and can't silently regress.

**Hexagonal / DDD backend.** Each bounded context (`accounts`, `notes`,
`observability`) is layered `interface → application → domain`, with the **domain
framework-free** (pure Python, business rules live there). The Django ORM and DRF are
adapters behind ports. The dependency rule ("point inward") is **enforced by
import-linter** — importing the ORM into the domain fails the build. Race-sensitive
writes use a `UnitOfWork` (`transaction.atomic()` + `select_for_update()`), which is
also what makes the concurrency features safe.

**Feature-Sliced Design frontend.** Layers `app → views → widgets → features →
entities → shared` import one-way, and slices talk to each other only through a public
`index.ts`. **dependency-cruiser** enforces both, so the frontend can't rot into
spaghetti. All network access goes through one typed API layer; components never call
`fetch` directly.

**The database is the operational log.** Every request, domain event, and error is a
queryable row (`RequestLog` / `EventLog` / `ErrorLog`), correlated by a per-request
`request_id`, with secrets redacted and rows never deleted. This makes failures
self-describing — and enables an **agentic triage loop** (`/triage-logs`) that reads the
error log, reproduces a failure with a test, fixes the code, and opens a PR.

**Supabase as managed Postgres.** Django connects via `DATABASE_URL`; Supabase is the
database (and, for the collaboration tier, Realtime for presence/locking). Django keeps
ownership of auth and all business logic — no logic pushed into edge functions.

**Concurrency & offline (collaboration tier).** Optimistic concurrency (a `version`
per note → 409 on conflict) plus an advisory DB lock with a TTL/heartbeat (→ 423 when
held by someone else). Online, opening a note locks it; offline, edits queue in a local
outbox and reconcile on reconnect (last-write-wins with a "changed elsewhere" notice).

**Prioritisation for the time box.** I built in tiers so the app is always shippable:
Tier 1 (auth → notes → board) is the complete app the video demonstrates; the
collaboration tier is additive. The upfront investment in guardrails paid for itself by
keeping every later change clean and tested without manual policing.

---

## How code quality is enforced

I didn't rely on the AI (or myself) *remembering* to write clean, tested code — the
project makes bad code fail to build. Three ideas:

**Enforce, don't suggest.** Anything that matters is backed by a tool that fails the
build, not by prose an agent can drift from under context pressure.

**Tests are a contract.** A red test means the *code* is wrong, not the test. A
pre-edit hook blocks the usual ways an AI "passes" a test by cheating — adding
`@pytest.mark.skip` / `xfail` / `.only`, deleting assertions, adding `# type: ignore`
/ `@ts-ignore` / `eslint-disable`, or lowering the coverage floor — and the shell
escapes too (`git commit --no-verify`, `pytest --no-cov`). So a failing test can only
be resolved by fixing the code. Tests are also derived from the spec's acceptance
criteria and each names the criterion it covers (`# covers 1.2`), so coverage is
meaningful, not padding.

**Architecture is a check, not a guideline.**
- **Backend (`import-linter`):** the domain may not import Django/DRF or the adapters,
  and layers point inward (`interface → application → domain`). Import the ORM into the
  domain "to save time" → the build goes red.
- **Frontend (`dependency-cruiser`):** FSD layers import one-way and slices talk only
  through their public `index.ts`. Reach into another slice's internals → the build
  goes red.

**Three gates, escalating:**

1. **In-session hooks** — auto-format every file on save; block test-weakening and
   destructive edits *before* they land.
2. **Pre-commit** — a fast gate (lint, format, boundary checks, affected tests,
   coverage) that also refuses to commit a skipped or focused test.
3. **CI (GitHub Actions)** — the authoritative gate on every push: `ruff`, `mypy`,
   `import-linter`, `dependency-cruiser`, `tsc`, and the full `pytest` + Vitest suites
   with an **85% coverage floor**.

The whole gate in one command (`/verify`, and CI):
`ruff · mypy · lint-imports` (backend) · `eslint · tsc · depcruise` (frontend) ·
`pytest --cov` · `vitest`.

And the enforcement config itself — `import-linter`, `dependency-cruiser`, CI, the
coverage settings — is change-protected: editing it needs explicit approval, so the
guardrails can't quietly weaken themselves.

---

## AI tools & how I used them

| Tool | How I used it |
|------|---------------|
| **Claude (Cowork / claude.ai)** | Designed the whole engineering setup — `CLAUDE.md`, rules, skills, guardrail hooks, CI, the architecture docs, and the spec-kit template. Authored the feature specs from the transcript + video frames. Built the transcription utility. |
| **OpenAI Speech-to-Text API** (`whisper-1`) | Transcribed the walkthrough video's audio to timestamped text — the primary source for the functional requirements. |
| **ffmpeg** | Extracted the audio for transcription and pulled video keyframes (aligned to the transcript) so the visual demo context wasn't lost. |
| **Claude Code** | Implemented the app from the specs, one feature at a time via the custom `/spec-implement` skill, with all guardrails (test-integrity, import-linter, dependency-cruiser, coverage floor) enforced on every change. |
| **Figma plugin for Claude Code** (Figma MCP) | Pulled exact design tokens (colours, spacing, type) and frames from the Figma so the UI matched the design. |

The through-line: I used AI not just to write code, but to **build a system that makes
AI write good code** — specs as the source of truth, and guardrails that fail the build
on anything that drifts.

---

## Running it locally

No Supabase needed to run locally — the backend defaults to SQLite; set `DATABASE_URL`
to point at Supabase.

**Backend** (→ http://127.0.0.1:8000):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend** (→ http://localhost:3000):
```bash
cd frontend
npm install
npm run dev
```

**Quality gates:**
```bash
# backend
ruff check . && mypy . && lint-imports && pytest --cov=. --cov-report=term-missing
# frontend
npm run lint && npm run typecheck && npm run arch && npm test -- --run
```

## Repo structure

```
backend/     Django project — hexagonal contexts (accounts, notes, observability, shared)
frontend/    Next.js app — Feature-Sliced Design (src/{views,widgets,features,entities,shared})
specs/       Spec-kit specs per feature (requirements / design / tasks) + raw sources
docs/        ARCHITECTURE.md, FRONTEND_ARCHITECTURE.md, AI_USAGE.md
tools/       transcribe/ — video → text utility (OpenAI + ffmpeg)
.claude/     CLAUDE.md config, rules, skills, guardrail hooks
```

## Testing & coverage

Tests are written from the specs' acceptance criteria, per layer — domain (pure), use
cases (in-memory fakes, no DB), infrastructure/interface (real DB / API), and frontend
(unit + integration with the network mocked). Coverage floor is 85%, enforced in CI and
the pre-commit hook.

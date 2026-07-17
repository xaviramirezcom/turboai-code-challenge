# Setting up Claude Code for the Turbo AI notes-app challenge

This guide explains how to configure a Claude Code project so it produces
clean, well-tested, industry-standard code — and how each piece maps to the way
this specific challenge is graded (functionality, code quality + coverage,
creativity/AI use, time management).

It ships with a ready-to-use `.claude/` scaffold. You can drop the whole folder
into your repo and start, or read this to understand and adapt each part.

---

## The mental model: four steering tools

Claude Code gives you four distinct levers. Using the right one for each job is
what separates a project that "has a CLAUDE.md" from one that reliably produces
good code:

| Tool | Loaded | Cost | Use it for |
|------|--------|------|-----------|
| **CLAUDE.md** (+ `rules/`) | Every session (rules load by path) | Paid every request | Always-true conventions Claude must never forget |
| **Skills** (`.claude/skills/`) | Description at startup, body on demand | Cheap until used | Reusable *workflows* and reference material |
| **Hooks** (`settings.json`) | Deterministic, outside the model | None (they're code) | *Enforcement* — format, block, gate. Not suggestions |
| **Subagents** (`.claude/agents/`) | On delegation, isolated context | Separate context window | Focused jobs like review, so the main thread stays clean |

The key insight: **CLAUDE.md persuades, hooks enforce.** A note in CLAUDE.md
saying "always format your code" is advice the model can drift from under
context pressure. A `PostToolUse` hook that runs the formatter *is* formatting,
every time, whether or not the model remembers. For a hiring challenge where
consistency is the signal, put anything that must always happen into a hook.

---

## What's in this scaffold

```
CLAUDE.md                          # always-on project memory (lean, <200 lines)
docs/ARCHITECTURE.md               # backend DDD/hexagonal reference (layers, ports, DI, tests)
docs/FRONTEND_ARCHITECTURE.md      # frontend Feature-Sliced Design reference (layers, slices, enforcement)
docs/AI_USAGE.md                   # AI-usage log template (a graded criterion)
backend/.importlinter              # enforces the backend inward dependency rule (lint-imports)
frontend/.dependency-cruiser.cjs   # enforces the FSD layer + slice boundaries (npm run arch)
specs/                             # spec-driven development (source of truth for behavior)
├── README.md                      # workflow + dual source-of-truth policy
├── EARS-cheatsheet.md             # how to write acceptance criteria
├── _template/                     # copy to specs/<feature>/ to start a spec
│   ├── requirements.md            # user stories + numbered EARS criteria
│   ├── design.md                  # data model, API contract, Figma frame links
│   └── tasks.md                   # ordered, test-first checklist
└── observability/                 # worked example spec: everything-logged + agentic fix
    ├── requirements.md            # EARS criteria for request/event/error logging
    ├── design.md                  # Django log models, middleware, log_event, commands
    └── tasks.md                   # test-first build order
.claude/
├── settings.json                  # permissions (allow/deny/ask) + hooks
├── settings.local.json.example    # personal, gitignored overrides template
├── rules/
│   ├── backend.md                 # Django/DRF rules — load only on backend/**
│   ├── frontend.md                # Next.js/React rules — load only on frontend/**
│   ├── observability.md           # DB-as-log conventions — load only on backend/**
│   └── specs.md                   # spec-writing rules — load only on specs/**
├── hooks/
│   ├── block-dangerous.sh         # PreToolUse: block rm -rf, force-push, --no-verify
│   ├── guard-tests.sh             # PreToolUse: block test-weakening edits
│   ├── format-file.sh             # PostToolUse: auto-format every edited file
│   └── quality-gate.sh            # Stop: remind of the definition of done
├── skills/
│   ├── django-endpoint/SKILL.md   # /django-endpoint — full DRF slice + tests
│   ├── react-component/SKILL.md    # /react-component — component + states + test
│   ├── spec-implement/SKILL.md    # /spec-implement — build a feature from its spec
│   ├── test-driven/SKILL.md       # /test-driven — red/green/refactor loop
│   ├── integration-test/SKILL.md  # /integration-test — cross-layer tests
│   ├── triage-logs/SKILL.md       # /triage-logs — agentic fix-from-logs loop
│   └── conventional-commit/SKILL.md# /conventional-commit — clean git history
├── commands/
│   └── verify.md                  # /verify — run the whole quality gate
└── agents/
    └── code-reviewer.md           # read-only reviewer subagent

.github/workflows/ci.yml           # ground truth: runs the real suite + coverage floor
.githooks/pre-commit               # local gate: blocks broken / skipped-test commits
```

---

## Install it (5 minutes)

1. **Copy the files** into your repo root so `CLAUDE.md` sits next to `backend/`
   and `frontend/`, and `.claude/` is a sibling.

2. **Make hooks executable** (if git didn't preserve the bit) and enable the
   pre-commit gate:
   ```bash
   chmod +x .claude/hooks/*.sh .githooks/pre-commit
   git config core.hooksPath .githooks
   ```

3. **Gitignore the personal + secret files.** Add to `.gitignore`:
   ```
   .claude/settings.local.json
   **/.env
   **/.env.*
   !**/.env.example
   ```
   Commit `.claude/settings.json`, the rules, skills, agents, and hooks — those
   are the shared, reviewable config a grader can see. Keep
   `settings.local.json` personal.

4. **Trust the workspace.** The first time you open the project, Claude Code
   asks you to approve the project's `allow` permission rules (a security
   feature — a repo can't silently grant itself permissions). Approve it.

5. **Install the tools the hooks call**, so formatting/linting actually runs:
   - backend: `ruff`, `mypy`, `import-linter`, `pytest`, `pytest-django`,
     `pytest-cov` (+ `django-environ`, `factory_boy`)
   - frontend: `prettier`, `eslint`, `dependency-cruiser`, TypeScript (scripts
     wired for `lint`, `format:check`, `typecheck`, `arch`, `test`)

   The hooks **no-op gracefully** if a tool isn't installed yet, so nothing
   breaks before you've set up dependencies.

6. **Sanity-check inside Claude Code:** run `/hooks` to see the registered
   hooks, `/context` to see what's loaded, and `/verify` to run the full gate.

---

## How each piece works

### CLAUDE.md — the always-on brief

Loaded into context at the start of every session, so it's paid for on every
request. That's why it's kept short and points to the heavier material rather
than inlining it. It carries: what you're building, the required stack, the
"golden rules," the exact build/test commands, and a definition of done.

Best practices baked in:
- **Under ~200 lines.** Long CLAUDE.md files dilute attention and cost tokens.
- **Verifiable instructions** ("`mypy` must pass") beat vibes ("write good
  code").
- **Commands are the source of truth** — Claude reads them here instead of
  guessing how to run your tests.

Edit it as the project's conventions solidify. You can also append to it live
with the `#` shortcut in Claude Code, or run `/init` on an existing repo to have
Claude draft one.

### rules/ — conventions that load only when relevant

`backend.md`, `frontend.md`, and `observability.md` use `paths:` frontmatter so
they load **only when Claude touches matching files.** This keeps the Django
conventions out of context while you're working on React and vice-versa — you get
depth without paying for it on every request. This is where the detailed,
opinionated standards live (hexagonal layering + the dependency rule, one API
layer, strict TS, required per-layer test matrices).

### skills/ — reusable workflows

Only each skill's one-line `description` loads at startup; the full body loads
when you invoke `/name` or when Claude matches the description to your task. So
you can keep detailed playbooks around for near-zero standing cost.

The included skills encode the *right way* to do the recurring jobs in this
project:
- `/django-endpoint` — build an endpoint as a full vertical slice (model →
  migration → serializer → view → route → tests), so nothing ships half-done.
- `/react-component` — component that matches Figma, uses the typed API layer,
  handles loading/empty/error, and has a test.
- `/test-driven` — red/green/refactor, including reproducing bugs with a failing
  test first.
- `/integration-test` — cross-layer tests: full request path through Django, and
  component + API layer with a mocked network on the frontend.
- `/conventional-commit` — small, well-messaged commits for a clean history.
- `/verify` — run the whole quality gate (backend + frontend) and report.

Invoke explicitly (`/django-endpoint add a tags field`) or just describe the
task and let Claude pick the skill up.

### hooks/ — deterministic enforcement

Hooks are shell commands Claude Code runs at lifecycle events. They're **code,
not prompts**, so they're guaranteed and unbiased by context. Four are wired:

- **`block-dangerous.sh` (PreToolUse, Bash).** Inspects the actual command
  string and blocks destructive patterns — `rm -rf`, `git reset --hard`,
  force-push, disk writes, secret-exfiltration pipes, and test-gate bypasses
  (`git commit --no-verify`, `pytest --no-cov`). Exit code `2` blocks the call
  and hands the reason back to Claude. Defense-in-depth *on top of* the `deny`
  permission list, catching commands a glob might miss.
- **`guard-tests.sh` (PreToolUse, Edit|Write).** The test-integrity guard
  (covered in detail in the section above): blocks edits that add skip/only/xfail
  markers or suppressions, remove assertions, or touch coverage thresholds.
- **`format-file.sh` (PostToolUse, Edit|Write).** Runs `ruff format` on `.py`
  and `prettier` on JS/TS/CSS/MD right after Claude writes a file, so every diff
  lands already formatted and you never see formatting churn in review.
- **`quality-gate.sh` (Stop).** When Claude finishes a turn with source files
  dirty, it prints a reminder of the exact lint/type/test commands. It's
  advisory (always exits 0) so it can't trap the session in a loop — the guide
  comment shows how to make it a hard gate once your suite is fast.

Hook contract in one line: on **PreToolUse**, exit `2` = block (stderr is the
reason), exit `0` = allow. Other events use exit `2` to feed stderr back to
Claude as context. Scripts receive the tool payload as JSON on **stdin** — the
scripts here parse it with `jq`, falling back to `python3`.

### settings.json — permissions

Three lists control what runs without a prompt:
- **`allow`** pre-approves the safe, repetitive commands (running tests, linters,
  `git diff`, editing under `backend/`/`frontend/`) so Claude isn't constantly
  asking and you keep flow.
- **`deny`** hard-blocks the dangerous or sensitive (reading `.env*`, `curl`,
  `rm -rf`, `sudo`). `deny` always wins over `allow`.
- **`ask`** forces a confirmation for consequential-but-legitimate actions
  (`git push`, `gh`, `git merge`).

`settings.json` is committed and team-shared; `settings.local.json` (from the
`.example`) is your personal, gitignored override layer.

### agents/code-reviewer.md — a second pair of eyes

A read-only subagent (`tools: Read, Grep, Glob, Bash` — no Edit/Write) that
reviews the diff against the challenge's graded criteria and returns a
prioritized findings list, all in its **own context window** so it doesn't
clutter the main thread. Invoke it before commits ("review the diff with the
code-reviewer agent") — it catches missing states, absent tests, leaked secrets,
and test-gaming (skipped tests, loosened assertions) while your main session
stays focused on building.

---

## Making Claude pass tests without weakening them

This is the crux of your question, and it's a real failure mode: the easiest way
to turn a red test green is to edit the test, add a `skip`, loosen an assertion,
or slap on a `# type: ignore` — and an agent optimizing for "make it pass" will
do exactly that unless stopped. No single setting fixes it. You defeat it with
**layers**, so a cheat that slips one layer is caught by the next.

**Layer 1 — Instruction (`CLAUDE.md`: "Tests are a contract").** Sets the rule
explicitly: a failing test means the code is wrong, change the code. This
reduces the behavior but can't be relied on alone, because instructions drift
under context pressure. That's why the next layers are code, not prose.

**Layer 2 — A blocking hook (`guard-tests.sh`, PreToolUse Edit|Write).** This is
the enforcement. Before any edit is applied, it inspects the change and blocks
(exit 2, with the reason handed back to Claude) when the edit:
- adds a `skip` / `xfail` / `.only` / `xit` / `describe.skip` marker,
- adds a `# type: ignore`, `@ts-ignore`, or `eslint-disable` suppression,
- **removes assertions** from a test file (it counts assertions in the removed
  vs added text — a net loss is blocked),
- touches a coverage threshold or test-ignore key in a config file.

Writing *new* tests sails through (they add assertions, not skips). Verified
behavior, from the scaffold's own tests:

| Attempted change | Result |
|---|---|
| Add `@pytest.mark.skip` to a test | **blocked** |
| Write a new test with real assertions | allowed |
| Delete assertions from an existing test | **blocked** |
| Add `@ts-ignore` to silence a type error | **blocked** |
| Lower `--cov-fail-under` in `pyproject.toml` | **blocked** |
| Normal implementation edit | allowed |

**Layer 3 — Bash guard (`block-dangerous.sh`) + self-protection.** Blocks the
shell escape routes: `git commit --no-verify`/`-n` (which would skip the
pre-commit gate) and `pytest --no-cov` / `--deselect`. And the enforcement
surfaces — `.claude/settings.json`, `.claude/hooks/**`, CI workflows, the git
hooks, `backend/.importlinter`, `frontend/.dependency-cruiser.*`, and the test
configs (`pyproject.toml`, `pytest.ini`, `jest`/`vitest` config) — are in the
`ask` list, so Claude can't *silently disable its own guardrails*; any such edit
needs your say-so. (Rules, skills, and agents under `.claude/` stay freely
editable.)

**Layer 4 — Pre-commit gate (`.githooks/pre-commit`).** Enable with
`git config core.hooksPath .githooks`. Runs the affected suite with the coverage
floor before a commit is allowed and refuses to commit staged tests containing
skip/only markers. Because `--no-verify` is blocked in Layer 3, Claude can't
route around it.

**Layer 5 — CI as ground truth (`.github/workflows/ci.yml`).** The decisive one.
It runs the tests *exactly as committed*, on GitHub's servers, with
`--cov-fail-under=85`. Claude never touches that run — the green/red check is
what a grader sees on your repo. Layers 1–4 make cheating hard and local; Layer 5
makes it **visible and permanent** in the PR history. Even if something slipped
locally, a weakened test or lowered threshold shows up in the diff and the check.

**Layer 6 — Review (`code-reviewer` agent).** A read-only pass whose checklist
now includes test integrity: no new skips, no bent expected-values, no mock that
replaced the thing under test, and new code must have a test. Run it before you
commit.

The honest caveat: no local guardrail is a cryptographic guarantee — a
determined edit can find a phrasing a regex doesn't match. That's *by design*
handled by Layer 5: the local layers exist to stop casual/accidental gaming and
keep the agent honest in-flow; CI is what makes the committed result
trustworthy. Keep the real enforcement (coverage floor, full suite) in CI, and
treat the hooks as fast feedback, not the last line of defense.

### Unit vs integration — cover both

- **Backend unit** (`pytest`): models, serializers, services in isolation.
- **Backend integration** (`/integration-test`): the full path through DRF's
  `APIClient` → URL → view → serializer → real test DB, asserting persisted
  state and status codes together.
- **Frontend unit** (Vitest + RTL): a component in isolation, API layer mocked.
- **Frontend integration** (`/integration-test`): component + the real API layer
  (`shared/api` + the slice's `api/`) with the *network* mocked via MSW,
  exercising a full user flow (load → create → delete → error state).
- **Optional E2E**: one Playwright smoke test against the running stack.

The coverage floor (`--cov-fail-under=85`) is enforced in CI and the pre-commit
hook, and the threshold itself is guard-protected — so "coverage" can't be
gamed by quietly lowering the bar.

---

## Spec-driven development (two sources of truth)

This project is built **spec-first**: you write the spec, the LLM implements
against it, and tests are derived from the spec's acceptance criteria. It layers
cleanly on top of everything above — the test-integrity guardrails become "don't
drift from the spec," and traceability gives you an audit trail graders love.

**What's authoritative.** Two documents, neither overriding the other:
- The **spec** (`specs/<feature>/`) owns *behavior, data, and API* — what
  happens, what's stored, what endpoints return, which states exist.
- The **Figma** owns *appearance* — layout, spacing, type, color, and how each
  state looks. `design.md` links the exact frame per UI-bearing criterion.
- **Conflicts are never resolved silently.** They go to `requirements.md` → Open
  questions and get raised. This is the whole point of SDD: no guessing.

**The spec structure** (spec-kit style, one folder per feature):
- `requirements.md` — user stories + numbered EARS acceptance criteria
  (`1.1`, `1.2`, …). EARS = `WHEN/IF/WHILE … THE SYSTEM SHALL …`; see
  `specs/EARS-cheatsheet.md`.
- `design.md` — architecture, data model, API contract, and Figma frame links,
  each tied to the criteria it serves.
- `tasks.md` — an ordered, test-first checklist, each task naming its criteria.

**Traceability is the contract.** Every acceptance criterion maps to at least
one test, and each test names the criterion it covers (`# covers 1.2`). No
production behavior exists that can't be traced to a criterion. The
`code-reviewer` and CI check this.

**How to run it:**
1. Copy `specs/_template/` to `specs/<feature>/` and fill in requirements →
   design → tasks. Review the spec yourself before any code — resolve or log
   open questions.
2. Run `/spec-implement <feature>`. It reads the spec, writes failing tests from
   the criteria first, implements task by task, and checks the UI against the
   linked Figma frame.
3. `/verify`, then the `code-reviewer` agent for spec conformance + no scope
   creep.

**What changed vs. the base setup** (so you can see the delta): `CLAUDE.md` now
declares the dual source of truth and the "flag conflicts, don't guess" rule; a
`specs/` tree and `specs.md` rule were added; a `/spec-implement` skill leads
feature work; and the reviewer + backend/frontend rules now check
criterion→test traceability and Figma fidelity. Editing a criterion after code
exists is fine — but it's deliberate: change the spec, re-derive the tests, then
change the code.

Because you chose to keep **both** the spec and the Figma authoritative, the
guardrails treat a missing detail differently from before: if something is
absent from *both* sources, Claude flags it instead of inventing a default
(only truly trivial gaps get a noted default). That keeps the design honest to
the prototype while the spec keeps the behavior honest.

---

## Backend architecture: DDD / hexagonal (enforced)

The backend is a **service-oriented modular monolith** with strict DDD and a
hexagonal (ports & adapters) layering — business rules in the code, Django/DRF as
adapters at the edges. The full reference (folder layout, a concrete notes
vertical slice across all layers, UoW + `select_for_update()`, DI, and per-layer
testing) is `docs/ARCHITECTURE.md`; the working rules are in
`.claude/rules/backend.md`, and the `/django-endpoint` skill walks the slice.

The one rule: **dependencies point inward** —
`interface → application → domain`, and the domain imports nothing from a
framework. What makes this real rather than aspirational is that it's
**mechanically enforced**: `backend/.importlinter` declares two contracts (a
`layers` chain and a `forbidden` rule that domain/application may not import
`django`, `rest_framework`, or the adapters), and `lint-imports` runs in
`/verify`, CI, and the pre-commit hook. Import the ORM into the domain to "save
time" and the build goes red — the same enforce-don't-suggest philosophy as the
test guard.

Two payoffs worth calling out for the challenge:
- **Testability as a coverage win.** The domain tests with no DB; use cases test
  against in-memory fakes (fast, exhaustive); only infrastructure and interface
  touch a real DB. That's a clean, layered test story graders can see.
- **It's a design-decisions artifact.** `docs/ARCHITECTURE.md` is exactly the
  "key design and technical decisions" the README asks for — it's written to be
  submitted.

One honest caveat baked into the doc: strict separation (domain entities + ORM
models + mappers) is more code than an active-record Django app. That's the
deliberate trade you chose; keep each context small and don't add layers a
context doesn't need.

## Frontend architecture: Feature-Sliced Design (enforced)

The frontend mirrors the backend's rigor with **Feature-Sliced Design** — a
layered architecture with one-way imports, enforced mechanically. Full reference:
`docs/FRONTEND_ARCHITECTURE.md`; working rules in `.claude/rules/frontend.md`; the
`/react-component` skill places work in the right slice.

Layers, high → low: `app` (Next routing/providers) → `views` (page
compositions) → `widgets` → `features` → `entities` → `shared`. A module imports
only from **strictly lower** layers, and cross-slice imports go through a slice's
public `index.ts` — never a deep path into another slice's internals.

Two deliberate Next.js adaptations (documented so they don't read as mistakes):
`frontend/app/` is the App Router (routes only, thin), and FSD's `pages` layer is
renamed **`views`** under `frontend/src/` to avoid Next's reserved directory
names.

The enforcement is the frontend counterpart to backend `import-linter`:
`frontend/.dependency-cruiser.cjs` declares no-circular, layer-order, and
slice-isolation rules, and `npm run arch` (`depcruise src`) runs them in
`/verify`, CI, and the pre-commit hook. Import upward, or deep-import another
slice, and the build goes red. "No `fetch` in components" is additionally caught
by an ESLint `no-restricted-syntax` rule (snippet in the frontend rule). Add
`dependency-cruiser` to the frontend dev deps and a `"arch": "depcruise src"`
script; validate the ruleset with `depcruise src --validate` once the tree exists.

Now both halves of the stack have a **named architecture** and a **tool that
fails the build on a boundary violation** — symmetric rigor, which is exactly the
signal a senior full-stack challenge is looking for.

## Agentic observability & auto-fix (Django translation of the blueprint)

A separately provided blueprint (`AGENTIC_BACKEND_ARCHITECTURE.md`, an external
input — not included in this scaffold) is Supabase-centric (edge functions,
stored procs, `pg_cron`, an MV3 extension). Its *portable* idea —
**the database is the operational log; every state transition is a
self-describing row; agents reason and fix from the DB alone** — is what we
adopted, in Django terms:

| Blueprint (Supabase) | This project (Django) |
|---|---|
| Edge functions | DRF views (thin: auth, validate, call a service) |
| Stored procs as the safe transaction boundary | service functions in `transaction.atomic()` + `select_for_update()` |
| `pg_cron` + `pg_net` housekeeping | scheduled-task tooling / Celery beat / mgmt commands |
| `actions_log` / `inbound_messages` / queue | `EventLog` / `RequestLog` / `ErrorLog` models |
| `raw_metadata` JSONB | `JSONField` metadata (redacted) |
| Never delete logs; one-shot UPDATE to resolve | append-only models; `logs_resolve` command |
| No triggers | `log_event()` called explicitly from services |
| `debug.sql` toolkit | `logs_report` management command + ORM snippets |

**Everything logged (requests + events + errors).** An `observability` app records
one `RequestLog` per request (method, path, status, duration, user, ip), one
`EventLog` per domain mutation (published via the `EventPublisher` port so the
domain stays framework-free), and one `ErrorLog` per unhandled exception *and*
per app `logger.error(...)`. A
per-request `request_id` (contextvar) stamps all three, so reconstructing any
request is a filter on one id — the blueprint's "single SELECT" debugging.
Secrets/PII are redacted before write; rows are never deleted. Full spec and
reference implementation (models, middleware, `log_event`, fingerprinting,
redaction, commands) live in `specs/observability/`; conventions in
`.claude/rules/observability.md`.

**The agentic auto-fix loop (`/triage-logs`)** — dev-time, PR-gated, exactly the
scope you chose:

1. `logs_report --unresolved --json` → error groups (by content `fingerprint`).
2. `logs_report --request <id>` → reconstruct the failing request's chronology.
3. Reproduce the failure with a **failing test first** (regression guard).
4. Fix the code (minimum change); the whole suite goes green.
5. `logs_resolve --fingerprint <fp> --by agent --note "…"` — appends a
   resolution, never deletes.
6. `/verify`, then **open a PR** (`gh pr create`, which is in the `ask` list, so
   it needs your yes). The PR carries the fingerprint, root cause, the
   reproducing test, and the fix.

This never touches a running system — it works in the repo against a dev/test DB,
and the PR is the human gate. It also composes with the guardrails: the test the
agent writes to reproduce the bug is protected by the test-integrity hook (it
can't later weaken it), and if the failure traces to a spec criterion the fix
stays anchored to the spec.

Why this is strong for the challenge: comprehensive logging plus a
reproduce-first fix loop is concrete evidence of code quality, test coverage, and
"effective AI use" — and the observability spec doubles as a worked example of
the spec-kit template.

---

## A workflow that plays to the grading

1. **Write the spec first.** Copy `specs/_template/` to `specs/<feature>/`, fill
   in requirements → design → tasks, and review it yourself. Confirm `/context`
   shows CLAUDE.md loaded and `/hooks` shows the hooks.
2. **Implement from the spec** with `/spec-implement <feature>` — it derives
   tests from the acceptance criteria first, then builds each task
   (`/django-endpoint` and `/react-component` are the building blocks it uses),
   and checks the UI against the linked Figma frame.
3. **Let the format hook** keep everything clean automatically; the test guard
   keeps the criteria-derived tests honest.
4. **Before each commit**, run the `code-reviewer` agent (spec conformance + no
   scope creep), then `/conventional-commit` for a tidy history.
5. **Run `/verify`** before you record the demo video to confirm the whole gate
   is green and every criterion is covered.
6. **Keep `docs/AI_USAGE.md` current** as you go — it becomes your README's
   AI-usage section with zero extra effort, and it's explicitly graded.

This maps directly onto what Turbo AI scores: the skills + rules drive
**functionality** and **code quality**, the required-tests conventions plus the
reviewer drive **coverage**, `AI_USAGE.md` documents **effective AI use**, and
the vertical-slice + clean-commit habit shows **time management**.

---

## Adapting it

- **Different test runner** (Jest instead of Vitest, unittest instead of
  pytest): update the commands in `CLAUDE.md`, the two `rules/` files, and
  `.claude/commands/verify.md`. Keep them in sync — Claude trusts what's written.
- **Single-package layout** instead of `backend/`+`frontend/`: adjust the
  `paths:` globs in the rules and the `Edit(...)` permissions.
- **Harder enforcement**: flip `quality-gate.sh`'s final `exit 0` to `exit 2`
  (per the comment in the file) once your suite runs fast, to actually block a
  turn until checks pass.
- **More skills**: add `.claude/skills/<name>/SKILL.md` with a `name` and a
  sharp `description` — a good description is what makes Claude pick it up at the
  right moment.

---

## Reference

Official docs used to build this (verify against the latest, as Claude Code
evolves):
- Memory / CLAUDE.md — https://code.claude.com/docs/en/memory
- Skills — https://code.claude.com/docs/en/skills
- Hooks — https://code.claude.com/docs/en/hooks-guide
- Subagents — https://code.claude.com/docs/en/sub-agents
- Settings & permissions — https://code.claude.com/docs/en/settings
- Steering Claude Code (overview) —
  https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more

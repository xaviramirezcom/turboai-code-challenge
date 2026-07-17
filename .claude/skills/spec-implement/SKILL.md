---
name: spec-implement
description: >
  Implement a feature from its spec (specs/<feature>/) the spec-driven way —
  read requirements + design + tasks, derive tests from the acceptance criteria
  first, implement task by task, and verify every criterion is covered and the
  UI matches the linked Figma. Use whenever building or extending a feature that
  has a spec folder.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Implement from a spec

The spec is authoritative for behavior and data; the Figma is authoritative for
appearance. Both must be satisfied. Do NOT invent scope or resolve conflicts
silently.

## 1. Read the whole spec first
Read `specs/<feature>/requirements.md`, `design.md`, and `tasks.md`. List the
numbered acceptance criteria (1.1, 1.2, …). If anything is ambiguous, or the
spec and Figma conflict, STOP and surface it (add to requirements.md → Open
questions) instead of guessing.

## 2. Work tasks top to bottom
For each task in `tasks.md`, in order:

a. **Tests first.** Write the test(s) for the criteria the task lists, and
   confirm they FAIL for the right reason. Each test names its criterion:
   - Python: `def test_...():  # covers 1.2`
   - TS: `it('rejects empty title', () => {}) // covers 1.2`
b. **Implement** the minimum code to satisfy those criteria — nothing the spec
   didn't ask for.
c. **For UI tasks**, build structure/data wiring per `design.md`, then match the
   linked Figma frame for layout, spacing, type, color, and every state
   (loading/empty/error). If a state is in the Figma but not the spec (or vice
   versa), flag it.
d. Run the task's tests green, then check the task box in `tasks.md`.

## 3. Traceability gate
Before declaring the feature done:
- Every acceptance criterion has at least one test that names its ID.
- No production behavior exists that isn't traceable to a criterion (no scope
  creep). If you found something genuinely needed but unspecified, add it to the
  spec first, then implement.

## 4. Verify
Run the full gate and confirm green:
```
# backend
ruff format --check . && ruff check . && mypy . && lint-imports && pytest --cov=. --cov-fail-under=85
# frontend
npm run lint && npm run format:check && npm run typecheck && npm run arch && npm test -- --run
```
Then run the `code-reviewer` agent for spec conformance and Figma fidelity.

## Reminder — tests are the spec made executable
A failing test means the code doesn't meet the spec. Fix the code, never weaken
the test (the guard hook enforces this). If the *spec* is wrong, change the spec
deliberately and re-derive the test.

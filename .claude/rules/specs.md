---
description: How to write and consume specs (spec-driven development)
paths:
  - "specs/**"
---

# Spec conventions

These load when you touch anything under `specs/`.

## The model

Each feature has a folder `specs/<feature>/` with three files:
`requirements.md` (user stories + numbered EARS acceptance criteria),
`design.md` (architecture, data model, API contract, Figma links), and
`tasks.md` (ordered, test-first checklist). Copy `specs/_template/` to start one.

## Two authorities, no silent conflicts

- The **spec** owns behavior, data, and API contracts.
- The **Figma** owns visual design and the appearance of each state.
- `design.md` must link the exact Figma frame for every UI-bearing criterion.
- If the spec and Figma disagree, record it under requirements.md → Open
  questions and raise it. Never resolve a conflict by guessing.

## Writing criteria

- Use EARS (see `specs/EARS-cheatsheet.md`): `WHEN/IF/WHILE … THE SYSTEM SHALL …`.
- One behavior per criterion; make it observable/testable.
- Number every criterion (`1.1`, `1.2`) — these IDs are the traceability keys.
- Always include unhappy paths (validation, empty, error), not just happy paths.

## Traceability is the contract

Every acceptance criterion maps to at least one test, and every such test names
the criterion it covers (`# covers 1.2`). Every task in `tasks.md` names the
criteria it satisfies. No production behavior should exist that can't be traced
to a criterion — if you need something unspecified, add it to the spec first.

## When editing a spec after code exists

Changing a criterion is allowed and normal — but it's a deliberate act: update
the spec, then re-derive the affected tests, then change the code. Do not edit
code or tests to diverge from the spec without updating the spec.

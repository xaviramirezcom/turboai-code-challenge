---
name: test-driven
description: >
  Drive a change test-first — write a failing test that pins the desired
  behavior, make it pass with the smallest change, then refactor. Use when
  implementing new behavior on either backend or frontend, or when fixing a bug
  (reproduce it with a test first).
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Test-driven workflow

Coverage is a graded criterion. Writing tests first keeps the design honest and
guarantees the behavior is actually exercised.

## Loop

1. **Red** — Write one test that describes the behavior you want (or reproduces
   the bug). Run it and confirm it FAILS for the right reason.
   - backend: `pytest path/to/test_x.py::test_name -q`
   - frontend: `npm test -- x.test.tsx`
2. **Green** — Write the minimum code to make it pass. Nothing extra.
3. **Refactor** — Clean up names, dedupe, extract; keep the test green.
4. **Widen** — Add edge cases: validation failures, empty inputs, boundaries,
   error paths. These are where graders look.

## For bug fixes
Always start by writing a test that reproduces the bug and fails. Only then fix
it. The test becomes a regression guard.

## Before done
Run the FULL suite, not just the new test, and confirm lint + type checks pass.
Never mark work complete with a red suite.

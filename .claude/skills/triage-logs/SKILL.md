---
name: triage-logs
description: >
  Agentic dev-time triage loop — read the error logs from the database,
  reproduce a failure with a test, fix the code, mark the error resolved, verify,
  and optionally open a PR. Use when the user asks to investigate errors, fix
  bugs from logs, or "auto-fix issues from the logs".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Triage & fix from the logs

The database is the operational log (see `specs/observability/`). This loop fixes
code from those logs, safely: reproduce with a test first, fix, and end with a
human-reviewed PR. It **never** mutates a running system or production data —
work happens in the repo against a dev/test database.

## Loop (one error group at a time)

### 1. Pull the errors
```
python manage.py logs_report --unresolved --json
```
This returns error groups (`fingerprint`, `count`, `first_seen`, `last_seen`,
`exc_type`, `sample_message`, `sample_request_id`). Pick the highest-impact
unresolved group (usually highest count / most recent). Report the shortlist.

### 2. Reconstruct context
```
python manage.py logs_report --request <sample_request_id>
```
Read the full chronology — the RequestLog, the EventLogs, and the ErrorLog for
that request. This tells you exactly what the system did before it failed. If the
failing behavior maps to a spec criterion, note the ID.

### 3. Reproduce with a failing test FIRST
Write a test that reproduces the logged failure (same inputs/state) and confirm
it FAILS for the right reason. This is the regression guard. Name it after the
error, and reference the criterion if there is one (`# covers 3.1`). Do NOT
weaken any existing test to make things pass — the guard hook enforces this.

### 4. Fix the code
Make the minimum change so the new test (and the whole suite) passes. If the
root cause is a missing/incorrect spec, update the spec first, then the test,
then the code.

### 5. Mark the error resolved (append, never delete)
```
python manage.py logs_resolve --fingerprint <fp> --by agent --note "fixed: <one line> (<branch/sha>)"
```
This sets `resolved_at/resolved_by/resolution_note` on the group. It never
deletes rows — history stays intact.

### 6. Verify
Run `/verify` (lint, types, tests, coverage ≥ 85%). All green, plus the new
regression test.

### 7. Open a PR (requires your approval)
On a fix branch, commit with `/conventional-commit`, then propose a PR:
`gh pr create` — this needs explicit confirmation (it's in the `ask` list). The
PR body should include: the error `fingerprint` + count, the root cause, the
reproducing test, and the fix. Do not push or open the PR without a clear yes.

## Guardrails on this loop
- Read logs and fix **code in the repo** — do not run destructive DB statements
  and do not "resolve" an error you didn't actually fix.
- One error group per branch/PR keeps changes reviewable.
- If an error can't be reproduced from the logged context, say so and stop —
  don't guess a fix. The gap is usually missing log context; note it.

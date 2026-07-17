---
name: conventional-commit
description: >
  Stage and create a clean, conventional-commits-style git commit for the
  current change. Use when the user asks to commit, or after finishing a
  reviewable slice of work. Produces a readable history for graders.
allowed-tools: Read, Bash
disable-model-invocation: false
---

# Conventional commit

A clean, incremental git history is high-signal in a hiring challenge. Commit
in small, logical units — never one giant "final" commit.

## Steps

1. `git status` and `git diff` to see exactly what changed. Group unrelated
   changes into separate commits.
2. Before committing, confirm the change passes its checks (lint, types, tests
   for the area touched). Don't commit a broken tree.
3. Stage deliberately (`git add <paths>`), not blindly with `git add -A` unless
   everything belongs together.
4. Write the message as `<type>(<scope>): <subject>`, imperative, ≤ 72 chars.
   - types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`, `ci`
   - scope: `notes`, `api`, `ui`, `config`, etc.
   - Add a short body explaining *why* when it isn't obvious.
5. Do NOT include secrets, `.env`, build artifacts, or `node_modules`.

## Example
```
feat(notes): add note create + list endpoints

Adds Note domain entity + repository port, NoteService use case, the
Django repository/UoW adapters, and the DRF viewset under /api/notes/,
with tests per layer. Ordering by -updated_at.
```

Note: pushing to a remote requires explicit approval — never `git push --force`.

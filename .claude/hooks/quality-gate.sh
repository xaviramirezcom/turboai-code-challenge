#!/usr/bin/env bash
# Stop hook. Runs when Claude finishes a turn. Advisory only (always exit 0) so
# it can never trap the session in a loop. It reminds Claude of the
# definition-of-done whenever code changed but the checks may not have run.
#
# If you want a HARD gate instead (block the turn until tests pass), change the
# final "exit 0" to "exit 2" inside the guarded block below — but be aware a
# blocking Stop hook re-prompts Claude, so only do this once your suite is fast
# and reliable.

set -uo pipefail

# Only nudge when source files are dirty.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  changed="$(git status --porcelain 2>/dev/null | grep -E '\.(py|ts|tsx|js|jsx)$' || true)"
  if [ -n "$changed" ]; then
    {
      echo "── quality gate reminder ─────────────────────────────"
      echo "Source files changed. Before considering this done, confirm:"
      echo "  backend:  ruff format --check . && ruff check . && mypy . && lint-imports && pytest --cov=."
      echo "  frontend: npm run lint && npm run format:check && npm run typecheck && npm run arch && npm test"
      echo "  no secrets / debug prints / console.log left behind"
      echo "──────────────────────────────────────────────────────"
    } >&2
  fi
fi

exit 0

---
name: verify
description: Run the full quality gate across backend and frontend and report what fails.
disable-model-invocation: false
---

# Full verification

Run the complete quality gate and report results concisely. Fix nothing here —
just run and summarize what passes and what fails.

Backend (from `backend/`, if it exists):
- `ruff format --check .`
- `ruff check .`
- `mypy .`
- `lint-imports`  (hexagonal dependency rule — see backend/.importlinter)
- `pytest --cov=. --cov-report=term-missing`
- `python manage.py check`

Frontend (from `frontend/`, if it exists):
- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run arch`  (FSD boundaries — see frontend/.dependency-cruiser.cjs)
- `npm test`

Report a short pass/fail table and the first actionable error for anything red.

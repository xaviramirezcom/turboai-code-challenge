---
description: Next.js + React + TypeScript conventions — Feature-Sliced Design
paths:
  - "frontend/**"
---

# Frontend conventions (Next.js + Feature-Sliced Design)

These load on frontend work. Full reference: `docs/FRONTEND_ARCHITECTURE.md`.
Build to satisfy `specs/<feature>/`; the Figma is authoritative for appearance.

## The architecture (enforced)

Feature-Sliced Design with a one-way layer order — a module imports only from
**strictly lower** layers (plus `shared`), and cross-slice imports go **only via
a slice's public `index.ts`**. This is enforced by `dependency-cruiser`
(`frontend/.dependency-cruiser.cjs`) via `npm run arch` in `/verify`, CI, and
pre-commit. A violation fails the build.

Layers (high → low): `app` (Next routing/providers) → `views` (page
compositions) → `widgets` → `features` → `entities` → `shared`.

## Next.js adaptations (deliberate)

- `frontend/app/` is the **Next.js App Router** (routes only, thin); a route
  renders a view from `src/views`. Providers/global styles in `app/layout.tsx`.
- FSD's `pages` layer is renamed **`views`** (`src/views/`) to avoid Next's
  reserved directory names. All other FSD layers live under `frontend/src/`.

## Layout

```
frontend/
├── app/                     # Next routes (thin): app/notes/page.tsx → <NotesView/>
├── src/
│   ├── views/<slice>/       # page compositions (ui/, index.ts)
│   ├── widgets/<slice>/     # UI blocks (ui/, model/, index.ts)
│   ├── features/<slice>/    # user actions (ui/, model/, api/, index.ts)
│   ├── entities/<slice>/    # business entities (model/, api/, ui/, index.ts)
│   └── shared/{api,ui,lib,config}/   # no slices, only segments
├── .dependency-cruiser.cjs
└── tsconfig.json
```

## Rules

- **Slices expose a public API.** Each slice has `index.ts`; other slices import
  only from it — never deep into another slice's `ui/`/`model/`/`api/`. (Enforced:
  `fsd-no-cross-slice-internals`.)
- **Segments:** `ui/` (components), `model/` (state, stores, hooks, types),
  `api/` (this slice's requests), `lib/`, `config/`.
- **One API layer:** the base HTTP client lives in `shared/api`; each slice's
  `api/` wraps it with typed endpoint functions whose types mirror the backend
  serializers. **Components never call `fetch`/`axios` directly** — enforce with
  ESLint (scope these to `**/ui/**` via an `overrides` block):
  ```jsonc
  // ban fetch()
  "no-restricted-syntax": ["error", {
    "selector": "CallExpression[callee.name='fetch']",
    "message": "No fetch in components — use the slice's api/ or model/."
  }],
  // ban importing axios in ui
  "no-restricted-imports": ["error", { "paths": [
    { "name": "axios", "message": "No axios in components — use the slice's api/." }
  ]}]
  ```
- **Server vs client components:** default to Server Components; add
  `"use client"` only for interactivity/state/effects. Keep client bundles small.
- **State:** local UI state with `useState`; server state through a slice's
  `model/` hooks (SWR/React Query or hand-rolled) — not scattered across ui.
- **TypeScript strict:** `"strict": true`, no `any`, no `!` to silence the
  compiler. `tsc --noEmit` must pass.
- **Match the Figma** for layout, spacing, type, color, and every state. If a
  detail is missing from BOTH the Figma and the spec, flag it — don't invent.
- **UX states:** every data view handles loading, empty, and error — not just the
  happy path.
- **Accessibility:** semantic elements, labelled inputs, keyboard operable,
  visible focus.
- **No secrets in the client:** only `NEXT_PUBLIC_*` reach the browser.

## Testing (per layer, colocated in each slice)

- `entities` / `shared` — pure unit tests (types, stores, helpers, props-only
  components).
- `features` — behavior: the action works, calls the mocked API, shows
  loading/error.
- `widgets` / `views` — integration with the network mocked via MSW; a full user
  flow. Query by role/label/text.
- Coverage floor enforced in CI + pre-commit.

## Quality bar before a frontend task is done

`npm run lint && npm run format:check && npm run typecheck && npm run arch && npm test`

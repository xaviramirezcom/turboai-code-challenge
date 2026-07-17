---
name: react-component
description: >
  Build or modify a frontend piece the Feature-Sliced Design way — place it in
  the right layer/slice/segment, expose it via the slice's public index, use the
  shared/slice API layer (never fetch in components), match the Figma, handle
  loading/empty/error, and ship a colocated test. Use for any frontend UI work.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Build a component (Feature-Sliced Design)

Full reference: `docs/FRONTEND_ARCHITECTURE.md`. The layer boundaries are
enforced by `npm run arch` (dependency-cruiser) — respect them or the build fails.

## 1. Place it in the right layer + slice
Decide the layer by responsibility:
- `entities/<x>` — the thing and its data (type, store, api, a presentational card).
- `features/<action>` — a user action (create/edit/delete/search) = form + mutation.
- `widgets/<block>` — composes entities + features into a block.
- `views/<page>` — page composition (rendered by a Next route in `app/`).
- `shared/*` — only if it's generic and business-agnostic.

Put it in the correct **segment**: `ui/`, `model/`, `api/`, `lib/`, `config/`.
Import only from **lower** layers, and from other slices only via their `index.ts`.

## 2. Type the contract
Reuse/define types in the slice `model/` (mirror the backend serializer). No
`any`, no `!`.

## 3. Data through the API layer only
Requests live in the slice's `api/` (built on `shared/api`). Components in `ui/`
call the slice's `model/` hooks or `api/` — **never `fetch` directly**.

## 4. Decide server vs client
Default to a Server Component; add `"use client"` only if it needs
state/effects/handlers.

## 5. Match the Figma + handle every state
Follow the linked Figma frame for appearance; render loading, empty, and error —
not just the happy path. Keyboard-operable, labelled, visible focus.

## 6. Export via the public API
Add the component/hook to the slice's `index.ts`. Don't let other slices reach
into your internals.

## 7. Test it (colocated) + check boundaries
RTL test in the slice (`__tests__`), mocking the API layer; assert user-visible
behavior and the empty/error states. Then:
```
npm run lint && npm run format:check && npm run typecheck && npm run arch && npm test -- --run
```
`npm run arch` must pass (no upward or cross-slice-internal imports).

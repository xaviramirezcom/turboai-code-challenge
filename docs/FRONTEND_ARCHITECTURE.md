# Frontend architecture — Feature-Sliced Design (FSD)

The frontend uses **Feature-Sliced Design**: a layered architecture with strict,
**enforced** import boundaries — the counterpart to the backend's hexagon. Where
the backend enforces "dependencies point inward" with `import-linter`, the
frontend enforces the FSD layer order with **dependency-cruiser**
(`frontend/.dependency-cruiser.cjs`), run in `/verify`, CI, and the pre-commit
hook. A boundary violation fails the build.

## The layers (import direction is one-way: top may import lower, never upward)

```
app       ← Next.js routing/providers at frontend/app/ (NOT src/app) — the thin top
─────────── the enforced src/ layers below ──────────────────────────────────────
views     ← page-level compositions (FSD "pages", renamed — see below)
widgets   ← self-contained UI blocks (a notes sidebar, an editor panel)
features  ← user actions with value (create-note, delete-note, search-notes)
entities  ← business entities + their data (note: model, api, card UI)
shared    ← framework-agnostic reusables (ui kit, api client, lib, config)
```

Rule: a module may import only from **strictly lower** layers (plus `shared`).
`entities` may use `shared`; `features` may use `entities` + `shared`; and so on.
`shared` imports nothing above it. This is what `dependency-cruiser` enforces
across the `src/` layers. Next's `frontend/app/` is routing only (the thin top);
it may import from `src/*` and is not itself part of the enforced src graph, so
there is no `src/app` layer.

## Two deliberate Next.js adaptations (documented, not accidental)

Next.js reserves the `app/` and `pages/` directory names for routing, which
collide with FSD's `app` and `pages` layers. The standard resolution, which we
use:

1. **`frontend/app/`** is the **Next.js App Router** (routing only). Each route
   file is thin — it renders a view. It plays the role of FSD's routing entry;
   global providers/styles live in `app/layout.tsx`.
2. **FSD's `pages` layer is renamed `views`** and lives at `frontend/src/views/`
   to avoid the reserved name. Everything else is standard FSD under
   `frontend/src/`.

So the tree is:

```
frontend/
├── app/                      # Next.js App Router — routes only (thin)
│   └── notes/page.tsx        # renders <NotesView/> from src/views
├── src/
│   ├── views/                # FSD "pages": page compositions
│   │   └── notes/            # a slice: ui/, index.ts
│   ├── widgets/
│   │   └── note-editor/      # ui/, model/, index.ts
│   ├── features/
│   │   ├── create-note/      # ui/, model/, api/, index.ts
│   │   └── delete-note/
│   ├── entities/
│   │   └── note/             # model/ (types, store), api/, ui/ (NoteCard), index.ts
│   └── shared/
│       ├── api/              # the base HTTP client (one place)
│       ├── ui/               # design-system primitives (Button, Input)
│       ├── lib/              # helpers, hooks
│       └── config/           # env, constants
├── .dependency-cruiser.cjs   # FSD boundary rules (enforced)
├── tsconfig.json
└── package.json
```

## Slices and segments

- Inside `entities`, `features`, `widgets`, `views`, a **slice** is a business
  area folder (e.g. `entities/note`, `features/create-note`).
- Each slice is split into **segments**: `ui/` (components), `model/` (state,
  stores, hooks, types), `api/` (requests for this slice), `lib/`, `config/`.
- Each slice exposes a **public API** via `index.ts`. Other slices import **only
  from `index.ts`** — never deep into another slice's `ui/`/`model/`. This
  "slice isolation" is enforced (`fsd-no-cross-slice-internals`).
- `shared` has **no slices**, only segments (`shared/ui`, `shared/api`, …).

## How the notes app maps onto FSD

- `entities/note` — the `Note` type, the data store/hooks (`model/`), the API
  calls (`api/`), and a presentational `NoteCard` (`ui/`).
- `features/create-note`, `features/delete-note`, `features/edit-note`,
  `features/search-notes` — one user action each (form + the mutation).
- `widgets/note-list`, `widgets/note-editor` — compose entities + features into
  a block.
- `views/notes` — the page composition placing the widgets.
- `app/notes/page.tsx` (Next route) — renders `views/notes`.
- `shared/api/client.ts` — the single typed HTTP client; every slice's `api/`
  segment builds on it. **Components never call `fetch` directly.**

## The "one API layer" rule, in FSD terms

The base client lives in `shared/api`. Entity/feature `api/` segments wrap it
with typed endpoint functions whose types mirror the backend serializers.
Components in `ui/` call the slice's `model/` (hooks) or `api/`, never `fetch`.
This is convention plus two enforcements: dependency-cruiser (no cross-slice deep
imports) and an ESLint `no-restricted-syntax` rule banning `fetch(`/`axios` in
`ui/` segments (see `.claude/rules/frontend.md`).

## Testing per layer

Colocate tests with slices (`entities/note/model/__tests__`, etc.). FSD makes the
test target obvious:
- `entities` / `shared` — pure unit tests (types, stores, helpers, presentational
  components with props).
- `features` — behavior tests: the action works, calls the (mocked) API, shows
  loading/error.
- `widgets` / `views` — integration tests with the API mocked at the network
  boundary (MSW), exercising a full flow.

Coverage floor (`--coverage`) is enforced in CI + pre-commit, same as backend.

## Enforcement (`frontend/.dependency-cruiser.cjs`)

Rules, checked by `npm run arch` (`depcruise src`):
1. **no-circular** — no dependency cycles.
2. **layer order** — a layer may not import from any layer above it.
3. **slice isolation** — a slice may not deep-import another slice's segments;
   go through the public `index.ts`.

Run it locally with `npm run arch`; it also runs in `/verify`, CI, and
pre-commit. Validate the ruleset against your real `src/` tree with
`depcruise src --validate` once the tree exists.

## Pragmatism note

A notes app won't fill every layer — that's fine. FSD scales down: skip a layer
you don't need (you may have no `widgets` early on), but keep the **direction**
and **slice isolation** rules. Don't create empty layer folders for symmetry.

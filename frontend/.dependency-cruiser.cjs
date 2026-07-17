/**
 * Feature-Sliced Design boundaries — the frontend counterpart to
 * backend/.importlinter. Enforces the FSD layer order and slice isolation.
 *
 * Run:      npm run arch      (i.e. `depcruise src --config .dependency-cruiser.cjs`)
 * Validate: `depcruise src --validate` once a real src/ tree exists.
 *
 * Layer order under src/ (high can import low, never upward):
 *   views > widgets > features > entities > shared
 * Next.js routing lives at `frontend/app/` (NOT `src/app/`); it is the thin top
 * that may import from src/* freely and is not part of the enforced src graph
 * (this config is run as `depcruise src`). So there is no `src/app` layer.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make the module graph impossible to reason about.",
      from: {},
      to: { circular: true },
    },

    // ---- FSD layer order: no importing UPWARD ----
    {
      name: "fsd-shared-is-lowest",
      severity: "error",
      comment: "shared/ is the lowest layer and must not import any upper layer.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(entities|features|widgets|views)/" },
    },
    {
      name: "fsd-entities-below-features",
      severity: "error",
      comment: "entities/ may use shared/ only — never features/widgets/views.",
      from: { path: "^src/entities/" },
      to: { path: "^src/(features|widgets|views)/" },
    },
    {
      name: "fsd-features-below-widgets",
      severity: "error",
      comment: "features/ may use entities/ and shared/ — never widgets/views.",
      from: { path: "^src/features/" },
      to: { path: "^src/(widgets|views)/" },
    },
    {
      name: "fsd-widgets-below-views",
      severity: "error",
      comment: "widgets/ may use features/entities/shared — never views.",
      from: { path: "^src/widgets/" },
      to: { path: "^src/views/" },
    },

    // ---- Slice isolation: cross-slice imports must go through the public index ----
    {
      name: "fsd-no-cross-slice-internals",
      severity: "error",
      comment:
        "Import another slice only via its public API (index.ts). No deep imports " +
        "into another slice's segments. ($1=layer, $2=slice captured from the source.)",
      from: { path: "^src/(entities|features|widgets|views)/([^/]+)/" },
      to: {
        path: "^src/(entities|features|widgets|views)/([^/]+)/(ui|model|api|lib|config)/",
        pathNot: "^src/$1/$2/",
      },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
  },
};

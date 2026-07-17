# Specs — spec-driven development

This project is built **spec-first**. Code exists to satisfy a spec; a spec is
not documentation written after the fact. The LLM reads the spec, derives tests
from its acceptance criteria, implements against it, and proves every criterion
is covered.

## Two sources of truth (both authoritative)

Behavior and design are governed by two documents, and **neither overrides the
other** — they own different things:

| Question | Authority |
|---|---|
| What should happen? (behavior, rules, edge cases) | **the spec** (`requirements.md`) |
| What data / API shape? | **the spec** (`design.md`) |
| What does it look like? (layout, spacing, type, color) | **the Figma** |
| Component states — hover, focus, empty, loading, error *visuals* | **the Figma** |
| Which states exist and what triggers them | **the spec** |
| Interactions, motion, responsive behavior | **the Figma** (spec may add rules) |

So a single feature is pinned from both sides: the spec says *"an empty state is
shown when the user has no notes"* (behavior) and the Figma says *what that empty
state looks like* (design). The `design.md` for each feature must **link the
exact Figma frame(s)** that realize its UI-bearing criteria.

**Conflict rule:** if the spec and the Figma disagree (e.g. the spec describes a
field the design doesn't show, or the design implies behavior the spec omits),
**do not silently pick one.** Record it under "Open questions" in the spec and
raise it. Guessing is the failure mode SDD exists to prevent.

## Structure

```
specs/
├── README.md              # this file
├── EARS-cheatsheet.md     # how to write acceptance criteria
└── <feature-name>/        # one folder per feature (e.g. notes-crud/)
    ├── requirements.md    # user stories + numbered EARS acceptance criteria
    ├── design.md          # architecture, data model, API contract, Figma links
    └── tasks.md           # ordered, test-first implementation checklist
```

Copy `_template/` to `specs/<feature-name>/` and fill it in.

## The workflow

1. **Write the spec** (or paste it into the template): requirements → design →
   tasks. Every acceptance criterion gets a stable ID (`1.1`, `1.2`, …).
2. **Review the spec yourself** before any code. Cheap to fix here, expensive
   later. Resolve or record open questions.
3. **Implement** with `/spec-implement <feature-name>`. For each task the LLM
   writes tests derived from the referenced criteria *first*, then the code,
   then checks the UI against the linked Figma frame.
4. **Trace.** Every acceptance criterion maps to at least one test; every test
   names the criterion it covers (e.g. `# covers 1.2`). The reviewer and CI
   check this.
5. **Verify.** `/verify` runs the full gate; the reviewer confirms the diff
   implements the spec — nothing missing, nothing out of scope.

## Why this is worth it for the challenge

The graders reward functionality, code quality/coverage, effective AI use, and
time management. A spec with criterion→test traceability is the most direct
evidence of all four: it shows you scoped the problem, drove the AI
deliberately, and can prove the app does what it claims. Keep the specs in the
repo — they *are* part of the submission's signal.

# AI Usage

> Keep this file updated as you build. The challenge README must explain how AI
> tools were used — maintaining this log as you go makes that section honest and
> effortless, and it's a graded criterion ("creativity / effective AI use").

## Tools used

- **Claude Code** — <primary coding assistant; scaffolding, endpoints, tests>
- <add others, e.g. Copilot, ChatGPT, v0>

## How I used them

Describe concretely, e.g.:

- Scaffolded the Django app structure and the DRF `Note` viewset + serializer.
- Generated the first pass of API and component tests, then reviewed/edited.
- Used the `code-reviewer` subagent before commits to catch missed states.
- Wrote the typed API client in `frontend/src/shared/api/` (+ the slice's `api/`)
  from the serializer shape.

## What I reviewed / changed by hand

Be specific about where you exercised judgment over the AI output — this is the
part graders care about most:

- <e.g. corrected an over-broad serializer that exposed a server-only field>
- <e.g. rewrote a component to use Server Components instead of client fetch>

## What I did NOT delegate

- <e.g. architecture decisions, the data model, UX trade-offs from the Figma>

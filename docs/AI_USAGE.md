# AI Usage

> Keep this file updated as you build. The challenge README must explain how AI
> tools were used — maintaining this log as you go makes that section honest and
> effortless, and it's a graded criterion ("creativity / effective AI use").

## Tools used

- **Claude Code** (Opus 4.8) — primary coding assistant, driven spec-first via
  the `/spec-implement` skill.

## How I used them (Auth feature)

- **Bootstrapped the whole backend** from empty scaffolds: Django project +
  `config` settings (DRF `TokenAuthentication`, `AUTH_PASSWORD_VALIDATORS`,
  observability middleware), the `observability` support module
  (RequestLog/EventLog/ErrorLog + redaction + fingerprinting), the `shared`
  kernel, the `notes` context's canonical `Category` model, and the `accounts`
  bounded context (domain → application → infrastructure → interface).
- **Derived tests from the numbered acceptance criteria first**, each test
  naming the criterion it covers (`# covers 1.2`), then implemented to green.
- Bootstrapped the frontend (Next.js App Router + Feature-Sliced Design) and
  wrote the auth slices (`shared/ui/password-input`, `entities/session`,
  `features/sign-up|log-in|log-out|require-auth`, `views/*`) with colocated
  Vitest/RTL tests using a mocked API.
- Wrote the typed API client in `frontend/src/shared/api/` and the per-slice
  `api/` wrappers from the DRF serializer shapes.

## What I reviewed / changed by hand (judgement calls)

- **Auth home** for the `accounts` context: chose to reuse Django's `User`
  (username == email) over a custom user model, to avoid `AUTH_USER_MODEL`
  migration-ordering risk.
- **Cross-context seeding**: kept `accounts.application` free of `notes` by
  seeding default categories through a `DefaultCategorySeeder` **port**, with the
  notes coupling isolated to `accounts.infrastructure.seeding` (enforced by
  import-linter).
- **Removed Django's session `AuthenticationMiddleware`** once it demanded
  `SessionMiddleware` — DRF token auth is per-view, so sessions aren't needed.
- **mypy**: aligned the `EventPublisher` port with `log_event`'s explicit
  signature (instead of silencing the `**object` type clash) and wrapped the
  untyped DRF `Token.key` in `str()` rather than adding an ignore.
- Resolved the spec's four open questions (token auth, ≥8-char policy, logout in
  scope, shared password toggle) and recorded them in `specs/auth/`.

## What I did NOT delegate

- The architecture (hexagonal boundaries, the port/adapter split), the data
  model, and the open-question decisions.
- The honest call to **flag that the Figma frames are unlinked** (no file URL in
  the specs) rather than invent pixel-exact visuals — recorded in
  `specs/auth/requirements.md` → Figma status.

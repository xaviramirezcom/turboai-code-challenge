---
description: Django backend conventions — DDD / hexagonal (ports & adapters)
paths:
  - "backend/**"
---

# Backend conventions (DDD / hexagonal)

These load whenever you touch `backend/`. Full reference with code:
`docs/ARCHITECTURE.md`. Build to satisfy `specs/<feature>/`.

## The dependency rule (enforced)

Dependencies point **inward**: `interface → application → domain`, with
`infrastructure` as an outer adapter that also depends inward. The **domain
imports nothing** from Django/DRF/infrastructure. This is enforced by
`import-linter` (`backend/.importlinter`) via `lint-imports` in `/verify`, CI,
and pre-commit — a violation fails the build. Do not "save time" by importing the
ORM into the domain; it will not merge.

## Layers (per bounded context, e.g. `notes/`)

- **domain/** — entities, value objects, domain exceptions, and repository
  **ports** (abstract). Pure Python; invariants enforced here (e.g. a note title
  can't be empty → raise a `DomainError`). No framework imports, ever.
- **application/** — use cases (`services.py`), command DTOs, and technical
  ports (`UnitOfWork`, `EventPublisher`). Orchestrates the domain and owns the
  transaction boundary. Imports domain + ports only — no Django.
- **infrastructure/** — adapters: Django ORM models (persistence only),
  repository implementations, `DjangoUnitOfWork` (`transaction.atomic()` +
  `select_for_update()` for race-safe claims), the event-publisher adapter.
- **interface/** — DRF serializers, viewsets, urls. Thin: translate HTTP ↔
  application command, call a use case, serialize the returned domain entity.
- **container.py** — composition root; the only place that wires concrete
  adapters to ports.

## Rules

- **Keep the domain framework-free.** ORM models live in `infrastructure`, not
  the domain. Map between them with `mappers.py`. Never return ORM objects past
  the repository boundary — repositories return domain entities.
- **Invariants in the domain.** Validation that is a business rule belongs in
  the entity/value object. Serializer validation is only shape/format at the
  edge.
- **Transactions in the application layer**, realized by the `DjangoUnitOfWork`
  adapter. Use `select_for_update()` in the repository only where a real race
  exists (concurrent update, counter, claim-from-queue) — not on every read.
- **DTOs/commands cross the application boundary.** DRF serializers stay in
  `interface` and never leak inward.
- **Log every mutation** by publishing a domain event through the
  `EventPublisher` port (the adapter writes `EventLog`); requests + errors are
  captured by the observability middleware. See `.claude/rules/observability.md`.
  Never log secrets; never DELETE log rows.
- **Migrations** are generated and committed with model changes; never edit an
  applied migration. Settings via `django-environ`; no hardcoded secrets.
- **Type hints** on all public functions; `mypy .` must pass.
- Trace each endpoint/use case to its acceptance-criteria IDs in tests
  (`# covers 1.2`).

## Testing (required, per layer)

- **domain:** pure unit tests, no DB (invariants, value objects).
- **application:** use-case tests with in-memory fakes (`FakeUnitOfWork`,
  `InMemoryNoteRepository`, `FakeEventPublisher`) — fast, no DB.
- **infrastructure:** integration tests with a real DB (repository round-trips,
  `select_for_update` locking behavior).
- **interface:** API tests via DRF `APIClient` (status + body shape), incl. a
  validation-failure path.
- Aim ≥ 85% coverage on each context; the floor is enforced in CI + pre-commit.

## Quality bar before a backend task is done

`ruff format . && ruff check . && mypy . && lint-imports && pytest --cov=. --cov-report=term-missing`

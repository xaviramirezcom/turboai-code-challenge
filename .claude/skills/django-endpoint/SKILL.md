---
name: django-endpoint
description: >
  Build or change a backend feature as a full hexagonal vertical slice — domain
  entity/port, application use case, infrastructure adapter (ORM + repository +
  UoW), interface (serializer + viewset + route), DI wiring, and tests per layer.
  Use for any backend API work on a bounded context.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Build a hexagonal vertical slice

Implement inside-out, one bounded context (e.g. `notes/`). The domain imports no
framework; the dependency rule is enforced by `lint-imports`. Reference with
full code: `docs/ARCHITECTURE.md`. Nothing ships without its per-layer tests.

## 1. domain (pure, test first)
- Add/adjust the entity and value objects; put invariants here (raise a
  `DomainError` on violation). Add/extend the repository **port** (abstract).
- Test: constructing with invalid data raises; valid data holds. No DB.

## 2. application (use case, fakes first)
- Add the command DTO and the use-case method on the service; orchestrate the
  domain and open the transaction via the `UnitOfWork` port; publish a domain
  event via the `EventPublisher` port.
- Test with in-memory fakes (`FakeUnitOfWork`, `InMemoryNoteRepository`,
  `FakeEventPublisher`): happy path + each failure path. No DB, so make it
  exhaustive. Name tests after criteria (`# covers 1.2`).

## 3. infrastructure (adapters)
- ORM model (persistence only) + migration; `mappers.py` for ORM↔entity; the
  repository implementation; `select_for_update()` where a real race exists;
  `DjangoUnitOfWork` if not present.
- Test (integration, real DB): repository round-trips an entity; lookups raise
  `NoteNotFound`; locking behavior where relevant.

## 4. interface (thin HTTP)
- DRF serializer (shape validation only), viewset method that maps request →
  command → use case → serialized domain entity, and the route on the router.
- Test (API via `APIClient`): success status+body and a 400 validation path.

## 5. wire + enforce
- Wire the adapters to ports in `container.py` (composition root).
- Run the dependency check: `lint-imports` must pass (domain/application stay
  framework-free).

## 6. verify
```
ruff format . && ruff check . && mypy . && lint-imports && pytest --cov=. --cov-fail-under=85
```
Migrations committed, coverage healthy, every touched criterion has a test.

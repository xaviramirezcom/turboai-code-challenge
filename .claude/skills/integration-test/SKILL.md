---
name: integration-test
description: >
  Write integration tests that exercise real seams — the full request path
  through Django (URL → view → serializer → DB) on the backend, and the
  component + typed API layer with a mocked network on the frontend. Use when a
  slice spans layers, not just a single unit.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Integration tests

Unit tests check a piece in isolation; integration tests check the seams where
pieces meet — which is where notes apps actually break. Do both. Tests are a
contract: to make one pass, change the code, never the assertion.

## Backend integration (Django/DRF)

Exercise the whole stack, not a mocked view:
- Use `pytest-django` with a real (test) database — hit the app through DRF's
  `APIClient` against the routed URL, so URL resolution, viewset, serializer
  validation, permissions, and DB persistence all run.
- Test end-to-end flows, e.g.:
  - create a note via `POST /api/notes/`, then `GET` it back and assert the
    persisted shape;
  - update then list and assert ordering (`-updated_at`);
  - a validation failure returns 400 AND does not write a row.
- Assert both status code and response body. Wrap DB-touching tests with
  `@pytest.mark.django_db`.

## Frontend integration (Next.js/React)

Test the component together with the real API layer, mocking only the network
boundary:
- Prefer **MSW (Mock Service Worker)** to intercept HTTP so the real API layer
  (`shared/api` + the slice's `api/`) runs; assert the component renders what the
  API returned.
- Cover a full user flow: load list → create a note → it appears; delete → it
  disappears; API error → error state shows and is recoverable.
- Query by role/label/text. Don't mock the slice `api/` functions directly when
  the point is to verify the client works.

## Optional end-to-end
If time allows, one Playwright happy-path against the running Next.js + Django
(create → see → edit → delete) is high-signal. Keep it to a smoke test; don't
sink hours here.

## Before done
Run the full suite (unit + integration) with coverage and confirm green:
`pytest --cov=. --cov-fail-under=85` and `npm test -- --coverage --run`.

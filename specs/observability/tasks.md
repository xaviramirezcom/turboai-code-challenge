# Tasks — Observability

Test-first, top to bottom. Each task names the criteria it covers.

## Foundation

- [ ] 1. Create `observability` app; add `RequestLog`, `EventLog`, `ErrorLog` models +
      migration. _Covers: 1.1, 2.1, 3.1, 4.1_ · _Tests: rows persist with the
      documented fields; log tables are never auto-deleted_
- [ ] 2. `context.py` request-id contextvar (`new_request_id`, `get_request_id`).
      _Covers: 1.2_ · _Tests: set/get within a context; isolation across contexts_
- [ ] 3. `fingerprint.py` + `redaction.py`. _Covers: 3.2, 1.4_ · _Tests: identical
      excs → same fingerprint, different → different; redact masks nested secrets_

## Wiring

- [ ] 4. `RequestLogMiddleware`: assign request_id, time the request, write
      RequestLog in `finally`, write ErrorLog in `process_exception`.
      _Covers: 1.1, 1.3, 3.1_ · _Tests (integration): one RequestLog per request
      with status+duration; a raising view writes ErrorLog AND RequestLog_
- [ ] 5. `log_event()` helper in `observability/`; notes publishes via the
      `EventPublisher` port and the `LoggingEventPublisher` adapter calls it for
      create/update/delete. _Covers: 2.1, 2.2, 2.3_ · _Tests: each mutation writes
      the expected EventLog stamped with the request_id_
- [ ] 6. `DBLogHandler` + logging config (JSON to stdout + DB handler at ERROR).
      _Covers: 3.3_ · _Tests: `logger.error(...)` creates an ErrorLog row_
- [ ] 7. Redaction applied to request metadata + headers.
      _Covers: 1.4_ · _Tests: Authorization/cookie/token never appear in any row_

## Agent interface

- [ ] 8. `logs_report` command: `--unresolved --json` (grouped by fingerprint)
      and `--request <id>` (chronology). _Covers: 3.4, 4.3_ · _Tests: grouping
      counts; chronology joins Request+Event+Error by request_id_
- [ ] 9. `logs_resolve` command: mark a fingerprint group resolved, never delete.
      _Covers: 4.2_ · _Tests: sets resolved_*; row count unchanged_

## Verification

- [ ] 10. Traceability: every criterion (1.1–4.3) has ≥1 test naming its ID.
- [ ] 11. `/verify` green (lint, types, tests, coverage ≥ 85%).
- [ ] 12. Confirm no secret leakage: grep the test-created rows for a planted
      token and assert absent.
- [ ] 13. `code-reviewer` pass: new endpoints/services emit events; no triggers;
      logs append-only.

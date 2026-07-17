---
description: Logging conventions — the DB is the operational log (agent-readable)
paths:
  - "backend/**"
---

# Observability conventions (the DB is the operational log)

Django translation of the "database as the operational log" blueprint. These
load on backend work. Full design: `specs/observability/`.

## The principle

Every meaningful thing the system does is a **queryable row with a timestamp**,
so an agent (or you in six months) can reconstruct what happened and fix it from
the DB alone — never by re-running the server. Capture **requests, domain
events, and errors**.

## Rules

- **Log every request.** `RequestLogMiddleware` writes one `RequestLog` per
  request (method, path, status, duration, user, ip, `request_id`). It runs in a
  `finally` so even a 500 is logged.
- **Correlate with `request_id`.** A UUID per request lives in a contextvar;
  every event and error stamps it. Reconstructing a request = filter all three
  tables by one id. This is the "single SELECT" debugging win.
- **Log every domain mutation.** The `observability` app exposes
  `log_event("note.created", actor=..., entity_type=..., entity_id=..., **metadata)`.
  Under the hexagonal rules, the application layer publishes via the
  `EventPublisher` **port** and the `LoggingEventPublisher` adapter calls
  `log_event` (so domain/application stay framework-free — see
  `docs/ARCHITECTURE.md`). One event row per create/update/delete.
- **Log every error.** Unhandled exceptions (via middleware) AND app
  `logger.error(...)` (via the DB handler) become `ErrorLog` rows with a full
  traceback and a stable `fingerprint` for grouping.
- **No triggers, no magic signals.** Events are recorded by explicit
  `log_event()` calls you can grep — same reason the blueprint bans triggers.
- **Append-only.** NEVER `DELETE` from log tables. To "resolve" an error, set
  `resolved_at/resolved_by/resolution_note` via `logs_resolve` — never delete.
- **Redact secrets.** Authorization headers, cookies, passwords, tokens, api
  keys, and known-sensitive fields are masked before anything is written. Logging
  everything must never mean logging credentials or PII.
- **Queryable data goes in real columns**, not buried in `metadata` JSON. The
  JSON is for context an agent reads, not for indexed filters.

## Migrations are the source of truth

Every schema/model change is a new numbered migration, committed with the code.
Never edit an applied migration; add a new one.

## Operational query toolkit (ORM)

```python
# Full chronology for one request
RequestLog.objects.filter(request_id=rid)
EventLog.objects.filter(request_id=rid).order_by("created_at")
ErrorLog.objects.filter(request_id=rid)

# Unresolved errors, grouped and ranked
(ErrorLog.objects.filter(resolved_at__isnull=True)
    .values("fingerprint", "exc_type")
    .annotate(n=Count("id"), last=Max("created_at")).order_by("-n"))

# Slow requests
RequestLog.objects.filter(duration_ms__gt=1000).order_by("-duration_ms")
```

Or use the agent interface: `python manage.py logs_report --unresolved --json`.

## Anti-patterns (translated from the blueprint)

| Anti-pattern | Use instead |
|---|---|
| Business logic / event writes hidden in signals or triggers | explicit `log_event()` in services |
| DELETE from log tables to "reset" | `logs_resolve` (append a resolution) |
| Timestamp-based error grouping | content `fingerprint` (exc type + norm msg + frame) |
| Queryable fields only in `metadata` JSON | real columns for anything you filter on |
| Logging raw request bodies / headers | redact sensitive keys first |

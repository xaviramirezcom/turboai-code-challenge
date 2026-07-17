# Requirements — Observability (everything logged, agent-readable)

## Introduction

Every meaningful thing the system does is recorded as a queryable row in the
database, so that an agent (or a human) can reconstruct what happened, diagnose
failures, and drive fixes **from the DB alone — without re-running anything.**
This is the Django translation of the "database as the operational log"
blueprint: append-only log models, request-id correlation, JSON metadata, and
never-delete semantics.

## Sources of truth

- **Behavior/data:** this spec.
- **Visual design:** n/a (no UI in this feature, aside from optional admin
  read views).

## Scope

Capture **requests + domain events + errors**. Not raw per-query debug logging.

## Requirements

### Requirement 1 — Every API request is logged

**User story:** As an operator/agent, I want every API request recorded, so that
I can see traffic, latency, and failures without instrumenting call sites.

**Acceptance criteria**

1.1. WHEN any request reaches the API, THE SYSTEM SHALL create one `RequestLog`
     row with method, path, status code, duration in ms, the authenticated user
     (or null), client IP, and a generated `request_id` (UUID).
1.2. THE SYSTEM SHALL make the same `request_id` available to all logs produced
     while handling that request (correlation).
1.3. IF handling a request raises an unhandled exception, THEN THE SYSTEM SHALL
     still write the `RequestLog` row (with the 5xx status) before the response
     returns.
1.4. THE SYSTEM SHALL NOT store secrets in the log: Authorization headers,
     cookies, passwords, tokens, and known-sensitive fields are redacted.

### Requirement 2 — Every domain event is logged

**User story:** As an agent, I want state changes recorded as events, so that I
can replay what the system did to any entity.

**Acceptance criteria**

2.1. WHEN a note is created, updated, or deleted, THE SYSTEM SHALL write one
     `EventLog` row with the action (e.g. `note.created`), the actor, the entity
     type and id, and a `metadata` JSON of the relevant change.
2.2. THE SYSTEM SHALL stamp each `EventLog` with the current `request_id` (from
     Requirement 1) so an entity's history and the request that caused it join.
2.3. THE SYSTEM SHALL record events via an explicit `log_event(...)` service
     call — NOT via database triggers or signals with hidden side effects.

### Requirement 3 — Every error is logged and agent-queryable

**User story:** As an agent running the triage loop, I want each error stored
with enough context to reproduce it, so that I can fix the code from the DB.

**Acceptance criteria**

3.1. WHEN an unhandled exception occurs, THE SYSTEM SHALL write one `ErrorLog`
     row with the exception type, message, full traceback, the `request_id`,
     the request method/path, and a `metadata` JSON.
3.2. THE SYSTEM SHALL compute a stable `fingerprint` (hash of exception type +
     normalized message + the raising traceback frame) so identical errors group.
3.3. THE SYSTEM SHALL record ERROR-level (and above) log records emitted by
     application code as `ErrorLog` rows, not only unhandled exceptions.
3.4. THE SYSTEM SHALL expose an unresolved-errors view grouped by `fingerprint`
     (count, first_seen, last_seen, a sample traceback and sample `request_id`).

### Requirement 4 — Logs are append-only and resolvable

**User story:** As a maintainer, I want history preserved, so that debugging and
audits are reproducible.

**Acceptance criteria**

4.1. THE SYSTEM SHALL NOT delete log rows in normal operation.
4.2. WHEN an error is fixed, THE SYSTEM SHALL mark its `fingerprint` group
     resolved (set `resolved_at`, `resolved_by`, `resolution_note`) via an
     explicit action — never by deleting rows.
4.3. THE SYSTEM SHALL provide a read-only management command that emits recent
     logs / error groups as JSON, as the agent's query interface.

## Open questions

- [ ] Retention: keep all rows for the challenge; note a future
      partition/archival strategy in the README.
- [ ] Async writes: synchronous is fine at challenge scale; flag if load testing
      shows request-path cost.

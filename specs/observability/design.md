# Design — Observability

Django translation of "the database is the operational log." A dedicated
`observability` app holds append-only models; middleware records requests +
errors; a `log_event()` helper records domain events; a `request_id` contextvar
correlates everything; a management command is the agent's read interface. This
`observability` app is a cross-cutting **support module**, not a 4-layer bounded
context — logging is infrastructure by nature.

## Architecture

```
request → RequestLogMiddleware (assign request_id, start timer)
            → DRF view → service.create_note() → log_event("note.created", ...)
          ← middleware writes RequestLog (+ ErrorLog on exception) ← response
```

- `observability/` app: `models.py`, `middleware.py`, `events.py` (log_event), a
  logging `handlers.py` (DB handler for ERROR records),
  `management/commands/logs_report.py`, `management/commands/logs_resolve.py`.
- Correlation via `contextvars` so `log_event` and the log handler can read the
  current `request_id` without threading it through every call.

## Data model (`observability/models.py`)

```python
import uuid
from django.db import models

class RequestLog(models.Model):
    request_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.PositiveSmallIntegerField(null=True)
    duration_ms = models.PositiveIntegerField(null=True)
    user = models.CharField(max_length=150, null=True, blank=True)
    ip = models.GenericIPAddressField(null=True)
    metadata = models.JSONField(default=dict)          # redacted query/params
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

class EventLog(models.Model):
    request_id = models.UUIDField(null=True, db_index=True)
    action = models.CharField(max_length=100, db_index=True)   # 'note.created'
    actor = models.CharField(max_length=150, null=True, blank=True)
    entity_type = models.CharField(max_length=100, null=True)
    entity_id = models.CharField(max_length=100, null=True, db_index=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

class ErrorLog(models.Model):
    request_id = models.UUIDField(null=True, db_index=True)
    fingerprint = models.CharField(max_length=64, db_index=True)   # grouping key
    level = models.CharField(max_length=20, default="ERROR")
    logger = models.CharField(max_length=200, null=True)
    exc_type = models.CharField(max_length=200, null=True)
    message = models.TextField()
    traceback = models.TextField(null=True)
    method = models.CharField(max_length=10, null=True)
    path = models.CharField(max_length=500, null=True)
    metadata = models.JSONField(default=dict)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=150, null=True, blank=True)  # 'agent'/'human'/sha
    resolution_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
```

Serves: 1.1–1.4 (RequestLog), 2.1–2.3 (EventLog), 3.1–3.4 & 4.2 (ErrorLog).
Status/level use Django `choices` where the value set is fixed; leave
free-form (`action`, metadata) uncapped so new event names don't require a
migration — mirrors the blueprint's "drop the CHECK on free-form labels."

## Correlation (`observability/context.py`)

```python
import contextvars, uuid
_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)

def new_request_id() -> str:
    rid = str(uuid.uuid4()); _request_id.set(rid); return rid

def get_request_id() -> str | None:
    return _request_id.get()
```

## Request + error middleware (`observability/middleware.py`)

Headers and request bodies are deliberately NOT stored (only the query dict,
redacted) — the safest way to satisfy 1.4 is to never write the secret in the
first place. `status` defaults to 500 so that if `get_response` raises, the
RequestLog still records a 5xx (criterion 1.3).

```python
import time, traceback
from .context import new_request_id, get_request_id
from .models import RequestLog, ErrorLog
from .redaction import redact
from .fingerprint import fingerprint_exc

class RequestLogMiddleware:
    def __init__(self, get_response): self.get_response = get_response

    def __call__(self, request):
        rid = new_request_id()
        request.request_id = rid
        start = time.monotonic()
        status = 500                     # default so a raising view logs as 5xx (1.3)
        try:
            response = self.get_response(request)
            status = response.status_code
            return response
        finally:
            RequestLog.objects.create(
                request_id=rid, method=request.method, path=request.path[:500],
                status_code=status,
                duration_ms=int((time.monotonic() - start) * 1000),
                user=getattr(getattr(request, "user", None), "username", None) or None,
                ip=request.META.get("REMOTE_ADDR"),
                metadata=redact({"query": dict(request.GET)}),  # headers/body not logged
            )

    def process_exception(self, request, exc):
        ErrorLog.objects.create(
            request_id=get_request_id(), fingerprint=fingerprint_exc(exc),
            exc_type=type(exc).__name__, message=str(exc),
            traceback="".join(traceback.format_exception(exc)),
            method=request.method, path=request.path[:500],
        )
        return None  # let Django's normal 500 handling continue
```

## Domain events (`observability/events.py`)

```python
from .context import get_request_id
from .models import EventLog

def log_event(action, *, actor=None, entity_type=None, entity_id=None, **metadata):
    EventLog.objects.create(
        request_id=get_request_id(), action=action, actor=actor,
        entity_type=entity_type, entity_id=str(entity_id) if entity_id else None,
        metadata=metadata,
    )
```

Under the hexagonal architecture (see `docs/ARCHITECTURE.md`), the notes
**application layer does not call `log_event` directly** — it publishes through
an `EventPublisher` port, and the infrastructure adapter calls `log_event`:

```python
# notes/infrastructure/events.py  (adapter behind the EventPublisher port)
from observability.events import log_event
class LoggingEventPublisher:
    def publish(self, name, **metadata):
        log_event(name, **metadata)
```

This keeps the domain/application framework-free while every mutation still lands
in `EventLog`. The observability middleware, models, and commands are a
cross-cutting support module (see note above), exempt from the notes context's
inward rule; `notes.infrastructure` may import `observability`, but
`notes.domain`/`notes.application` may not (enforced by import-linter).

## Fingerprint + redaction

```python
# observability/fingerprint.py
import hashlib, re, traceback
def fingerprint_exc(exc) -> str:
    tb = traceback.extract_tb(exc.__traceback__)
    frame = f"{tb[-1].filename}:{tb[-1].name}" if tb else ""   # deepest = raising frame
    norm = re.sub(r"\d+", "N", str(exc))         # normalize ids/counts
    key = f"{type(exc).__name__}|{norm}|{frame}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]

# observability/redaction.py
SENSITIVE = {"password", "token", "secret", "authorization", "api_key"}
def redact(obj):
    if isinstance(obj, dict):
        return {k: ("***" if k.lower() in SENSITIVE else redact(v)) for k, v in obj.items()}
    if isinstance(obj, list): return [redact(v) for v in obj]
    return obj
```

## ERROR-level log handler (`observability/handlers.py`)

Persist app `logger.error(...)` calls, not just unhandled exceptions (3.3):
```python
import logging
class DBLogHandler(logging.Handler):
    def emit(self, record):
        from .models import ErrorLog                # lazy import; avoid app-loading issues
        from .context import get_request_id
        try:
            fp = f"log:{record.name}:{record.getMessage()}"[:64]   # fits fingerprint(64)
            ErrorLog.objects.create(
                request_id=get_request_id(), fingerprint=fp,
                level=record.levelname, logger=record.name, message=record.getMessage(),
                traceback=self.format(record) if record.exc_info else None,
            )
        except Exception:                            # logging must never crash the app
            pass
```

Wire in `settings`: add `RequestLogMiddleware` to `MIDDLEWARE` (outermost), and a
`logging` config with a JSON formatter to stdout + the `DBLogHandler` at
`ERROR`. Keep the DB handler off during tests except the tests that assert it.
Consider scoping RequestLog to `/api/` paths so static/admin noise stays out.

## Agent query interface (`observability/management/commands/`)

```python
# logs_report.py  →  python manage.py logs_report --unresolved --json
#   emits error groups: [{fingerprint, count, first_seen, last_seen,
#                         exc_type, sample_message, sample_request_id}]
# also: --request <id>  → full chronology (RequestLog + EventLogs + ErrorLogs)
#
# logs_resolve.py →  python manage.py logs_resolve --fingerprint <fp> \
#                      --by agent --note "fixed in <sha>"
#   sets resolved_* on all rows in the group. NEVER deletes. (Req 4.2)
```

## Testing strategy

- **Unit:** `fingerprint_exc` groups identical errors and separates different
  ones; `redact` masks sensitive keys at any depth; `log_event` stamps the
  current request_id.
- **Integration:** an API request creates exactly one RequestLog with correct
  status/duration; a create/update/delete each writes the expected EventLog with
  the request's id; a view that raises writes an ErrorLog with a fingerprint AND
  still writes the RequestLog (1.3); a redacted header never appears in any row.
- **Command:** `logs_report --unresolved` groups by fingerprint; `logs_resolve`
  marks a group resolved without deleting rows.
- Coverage floor applies (`--cov-fail-under=85`).

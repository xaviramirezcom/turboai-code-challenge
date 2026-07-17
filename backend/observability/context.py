"""Per-request correlation id, stored in a contextvar.

Lets ``log_event`` and the DB log handler stamp the current ``request_id``
without threading it through every call.
"""

import contextvars
import uuid

_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


def new_request_id() -> str:
    rid = str(uuid.uuid4())
    _request_id.set(rid)
    return rid


def get_request_id() -> str | None:
    return _request_id.get()


def reset_request_id() -> None:
    _request_id.set(None)

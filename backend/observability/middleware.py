"""Request + error logging middleware.

Runs outermost so it wraps everything. Writes one RequestLog per request in a
``finally`` (so even a 500 is recorded), and an ErrorLog on an unhandled
exception. Request headers and bodies are deliberately NOT stored — only the
redacted query dict — so a secret is never written in the first place.
"""

import time
import traceback
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from .context import get_request_id, new_request_id
from .fingerprint import fingerprint_exc
from .models import ErrorLog, RequestLog
from .redaction import redact


class RequestLogMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        rid = new_request_id()
        setattr(request, "request_id", rid)  # noqa: B010 — attach for downstream
        start = time.monotonic()
        status = 500  # default so a raising view still logs as 5xx
        try:
            response = self.get_response(request)
            status = response.status_code
            return response
        finally:
            # Skip CORS preflights — they carry no operation, and dropping the
            # write saves a DB round-trip on every cross-origin call.
            if request.method != "OPTIONS":
                user = getattr(getattr(request, "user", None), "username", None) or None
                RequestLog.objects.create(
                    request_id=rid,
                    method=request.method or "",
                    path=request.path[:500],
                    status_code=status,
                    duration_ms=int((time.monotonic() - start) * 1000),
                    user=user,
                    ip=request.META.get("REMOTE_ADDR"),
                    metadata=redact({"query": dict(request.GET)}),
                )

    def process_exception(
        self, request: HttpRequest, exc: Exception
    ) -> HttpResponse | None:
        ErrorLog.objects.create(
            request_id=get_request_id(),
            fingerprint=fingerprint_exc(exc),
            exc_type=type(exc).__name__,
            message=str(exc),
            traceback="".join(traceback.format_exception(exc)),
            method=request.method,
            path=request.path[:500],
        )
        return None  # let Django's normal 500 handling continue

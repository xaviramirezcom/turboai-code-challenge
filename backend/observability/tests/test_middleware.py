"""RequestLogMiddleware records one row per request and logs unhandled errors."""

import pytest
from django.http import HttpResponse
from django.test import RequestFactory

from observability.middleware import RequestLogMiddleware
from observability.models import ErrorLog, RequestLog


@pytest.mark.django_db
def test_logs_one_request_row_with_status_and_query_redacted() -> None:
    rf = RequestFactory()
    mw = RequestLogMiddleware(lambda _req: HttpResponse(status=200))

    response = mw(rf.get("/api/thing/", {"token": "leak-me", "q": "ok"}))

    assert response.status_code == 200
    row = RequestLog.objects.get()
    assert row.method == "GET"
    assert row.path == "/api/thing/"
    assert row.status_code == 200
    assert row.metadata["query"]["token"] == "***"  # redacted
    assert row.metadata["query"]["q"] == ["ok"]


@pytest.mark.django_db
def test_request_row_still_written_when_view_raises() -> None:
    rf = RequestFactory()

    def boom(_req: object) -> HttpResponse:
        raise ValueError("kaboom")

    mw = RequestLogMiddleware(boom)
    with pytest.raises(ValueError):
        mw(rf.get("/api/boom/"))

    row = RequestLog.objects.get()
    assert row.status_code == 500  # default preserved through the raise


@pytest.mark.django_db
def test_process_exception_writes_error_log() -> None:
    rf = RequestFactory()
    mw = RequestLogMiddleware(lambda _req: HttpResponse())
    exc = ValueError("nope")

    result = mw.process_exception(rf.get("/api/x/"), exc)

    assert result is None
    err = ErrorLog.objects.get()
    assert err.exc_type == "ValueError"
    assert err.message == "nope"
    assert err.fingerprint

"""The DB log handler persists ERROR-level records as ErrorLog rows."""

import logging

import pytest

from observability.handlers import DBLogHandler
from observability.models import ErrorLog


@pytest.mark.django_db
def test_error_record_becomes_an_error_log_row() -> None:
    logger = logging.getLogger("test.db.handler")
    logger.propagate = False
    logger.setLevel(logging.ERROR)
    handler = DBLogHandler()
    logger.addHandler(handler)
    try:
        logger.error("something failed")
    finally:
        logger.removeHandler(handler)

    row = ErrorLog.objects.get(logger="test.db.handler")
    assert row.level == "ERROR"
    assert row.message == "something failed"


def test_handler_never_raises_even_if_persist_fails() -> None:
    # No django_db marker: ErrorLog.objects.create would raise; emit must swallow it.
    DBLogHandler().emit(
        logging.LogRecord("x", logging.ERROR, __file__, 1, "boom", None, None)
    )

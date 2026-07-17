"""A logging handler that persists ERROR-level records as ErrorLog rows.

Captures app ``logger.error(...)`` calls, not just unhandled exceptions.
Logging must never crash the app, so failures here are swallowed.
"""

import logging


class DBLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        from .context import get_request_id
        from .models import ErrorLog

        try:
            fp = f"log:{record.name}:{record.getMessage()}"[:64]
            ErrorLog.objects.create(
                request_id=get_request_id(),
                fingerprint=fp,
                level=record.levelname,
                logger=record.name,
                message=record.getMessage(),
                traceback=self.format(record) if record.exc_info else None,
            )
        except Exception:  # noqa: BLE001 — logging must never crash the app
            pass

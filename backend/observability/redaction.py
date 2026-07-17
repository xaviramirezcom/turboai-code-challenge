"""Mask sensitive values before anything is written to a log row.

Logging everything must never mean logging credentials or PII. Keys are matched
case-insensitively at any depth of dicts/lists.
"""

from typing import Any

SENSITIVE = {"password", "token", "secret", "authorization", "api_key", "apikey"}
MASK = "***"


def redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {
            k: (MASK if str(k).lower() in SENSITIVE else redact(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [redact(v) for v in obj]
    return obj

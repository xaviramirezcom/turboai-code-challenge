"""``log_event`` — record one EventLog row per domain mutation.

Domain/application code never calls this directly; it publishes through the
``EventPublisher`` port and the infrastructure adapter calls this (keeping the
inner layers framework-free). See ``docs/ARCHITECTURE.md``.
"""

from typing import Any

from .context import get_request_id
from .models import EventLog


def log_event(
    action: str,
    *,
    actor: str | None = None,
    entity_type: str | None = None,
    entity_id: object | None = None,
    **metadata: Any,
) -> None:
    EventLog.objects.create(
        request_id=get_request_id(),
        action=action,
        actor=actor,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        metadata=metadata,
    )

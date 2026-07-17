"""EventPublisher adapter → writes EventLog via the observability module."""

from observability.events import log_event


class LoggingEventPublisher:
    def publish(
        self,
        name: str,
        *,
        actor: str | None = None,
        entity_type: str | None = None,
        entity_id: object | None = None,
        **metadata: object,
    ) -> None:
        log_event(
            name,
            actor=actor,
            entity_type=entity_type,
            entity_id=entity_id,
            **metadata,
        )

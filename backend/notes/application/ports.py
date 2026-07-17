"""Technical ports the notes use cases depend on. Concrete adapters live in
``notes.infrastructure`` and are wired at ``notes.container``.
"""

from datetime import datetime
from types import TracebackType
from typing import Protocol


class UnitOfWork(Protocol):
    def __enter__(self) -> "UnitOfWork": ...
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...


class EventPublisher(Protocol):
    def publish(
        self,
        name: str,
        *,
        actor: str | None = None,
        entity_type: str | None = None,
        entity_id: object | None = None,
        **metadata: object,
    ) -> None: ...


class Clock(Protocol):
    def now(self) -> datetime: ...

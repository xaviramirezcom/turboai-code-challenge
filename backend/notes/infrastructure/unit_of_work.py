"""DjangoUnitOfWork — the transaction boundary adapter (transaction.atomic)."""

from types import TracebackType

from django.db import transaction


class DjangoUnitOfWork:
    def __enter__(self) -> "DjangoUnitOfWork":
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if exc_type is not None:
            transaction.set_rollback(True)
        self._atomic.__exit__(exc_type, exc, tb)

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        transaction.set_rollback(True)

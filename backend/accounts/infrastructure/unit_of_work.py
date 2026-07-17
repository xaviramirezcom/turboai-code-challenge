"""DjangoUnitOfWork — the transaction boundary adapter.

Wraps ``transaction.atomic()``: writes inside the ``with`` block commit together
on a clean exit and roll back together if the block raises (auth 1.5 atomicity).
"""

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
        # The atomic block commits on clean exit; this is the explicit marker.
        pass

    def rollback(self) -> None:
        transaction.set_rollback(True)

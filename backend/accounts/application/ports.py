"""Technical ports the AuthService depends on. Concrete adapters live in
``accounts.infrastructure`` and are wired at the composition root
(``accounts.container``). Structural (Protocol) so adapters need no inheritance
and infrastructure stays decoupled.
"""

from types import TracebackType
from typing import Protocol

from ..domain.entities import UserAccount


class UserRepository(Protocol):
    def exists_by_email(self, email: str) -> bool: ...
    def create_user(self, email: str, raw_password: str) -> UserAccount: ...
    def verify_credentials(
        self, email: str, raw_password: str
    ) -> UserAccount | None: ...


class TokenIssuer(Protocol):
    def issue(self, user_id: int) -> str: ...
    def revoke(self, user_id: int) -> None: ...


class PasswordPolicy(Protocol):
    def validate(self, raw_password: str, *, email: str) -> None: ...


class DefaultCategorySeeder(Protocol):
    def seed_defaults(self, owner_id: int) -> None: ...


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

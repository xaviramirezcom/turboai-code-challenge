"""AuthService — the auth use cases. Framework-free: it orchestrates the domain
through ports and owns the transaction boundary. No Django imports.
"""

from dataclasses import dataclass

from ..domain.entities import UserAccount
from ..domain.exceptions import EmailAlreadyRegistered, InvalidCredentials
from .commands import Login, Register
from .ports import (
    DefaultCategorySeeder,
    EventPublisher,
    PasswordPolicy,
    TokenIssuer,
    UnitOfWork,
    UserRepository,
)


@dataclass(frozen=True)
class AuthResult:
    user: UserAccount
    token: str


class AuthService:
    def __init__(
        self,
        *,
        users: UserRepository,
        tokens: TokenIssuer,
        seeder: DefaultCategorySeeder,
        password_policy: PasswordPolicy,
        uow: UnitOfWork,
        events: EventPublisher,
    ) -> None:
        self._users = users
        self._tokens = tokens
        self._seeder = seeder
        self._password_policy = password_policy
        self._uow = uow
        self._events = events

    @staticmethod
    def _normalize(email: str) -> str:
        return email.strip().lower()

    def register(self, cmd: Register) -> AuthResult:
        email = self._normalize(cmd.email)
        # Password policy first, then uniqueness (both raise field-level errors, 1.3).
        self._password_policy.validate(cmd.password, email=email)
        if self._users.exists_by_email(email):
            raise EmailAlreadyRegistered(email)

        # Create the user and seed their 3 default categories atomically (1.5).
        with self._uow as uow:
            user = self._users.create_user(email, cmd.password)
            self._seeder.seed_defaults(user.id)
            uow.commit()

        token = self._tokens.issue(user.id)
        self._events.publish(
            "user.registered", actor=user.email, entity_type="User", entity_id=user.id
        )
        return AuthResult(user=user, token=token)

    def login(self, cmd: Login) -> AuthResult:
        email = self._normalize(cmd.email)
        user = self._users.verify_credentials(email, cmd.password)
        if user is None:
            raise InvalidCredentials(email)
        token = self._tokens.issue(user.id)
        self._events.publish(
            "user.logged_in", actor=user.email, entity_type="User", entity_id=user.id
        )
        return AuthResult(user=user, token=token)

    def logout(self, user_id: int) -> None:
        self._tokens.revoke(user_id)
        self._events.publish("user.logged_out", entity_type="User", entity_id=user_id)

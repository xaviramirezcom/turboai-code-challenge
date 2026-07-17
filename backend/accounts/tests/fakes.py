"""In-memory port fakes for fast, DB-free AuthService unit tests.

The fake UnitOfWork snapshots the store on enter and restores it if the block
raises — modelling ``transaction.atomic`` so the atomicity criterion (1.5) is
exercised without a database.
"""

import copy
from types import TracebackType

from accounts.domain.entities import UserAccount
from accounts.domain.exceptions import EmailAlreadyRegistered, WeakPassword


class FakeStore:
    def __init__(self) -> None:
        self.users: dict[str, dict[str, object]] = {}
        self.categories: dict[int, list[str]] = {}
        self._seq = 0

    def next_id(self) -> int:
        self._seq += 1
        return self._seq


class FakeUserRepository:
    def __init__(self, store: FakeStore) -> None:
        self.store = store

    def exists_by_email(self, email: str) -> bool:
        return email in self.store.users

    def create_user(self, email: str, raw_password: str) -> UserAccount:
        if email in self.store.users:
            raise EmailAlreadyRegistered(email)
        uid = self.store.next_id()
        self.store.users[email] = {"id": uid, "password": raw_password}
        return UserAccount(id=uid, email=email)

    def verify_credentials(self, email: str, raw_password: str) -> UserAccount | None:
        rec = self.store.users.get(email)
        if rec is None or rec["password"] != raw_password:
            return None
        return UserAccount(id=int(rec["id"]), email=email)


class FakeCategorySeeder:
    def __init__(self, store: FakeStore, *, fail: bool = False) -> None:
        self.store = store
        self.fail = fail

    def seed_defaults(self, owner_id: int) -> None:
        if self.fail:
            raise RuntimeError("seed failed")
        self.store.categories.setdefault(owner_id, [])
        self.store.categories[owner_id].extend(
            ["Random Thoughts", "School", "Personal"]
        )


class FakeTokenIssuer:
    def __init__(self) -> None:
        self.issued: dict[int, str] = {}
        self.revoked: list[int] = []

    def issue(self, user_id: int) -> str:
        self.issued[user_id] = f"token-{user_id}"
        return self.issued[user_id]

    def revoke(self, user_id: int) -> None:
        self.revoked.append(user_id)
        self.issued.pop(user_id, None)


class FakePasswordPolicy:
    def __init__(self, min_length: int = 8) -> None:
        self.min_length = min_length

    def validate(self, raw_password: str, *, email: str) -> None:
        if len(raw_password) < self.min_length:
            raise WeakPassword(["This password is too short."])


class FakeUnitOfWork:
    def __init__(self, store: FakeStore) -> None:
        self.store = store
        self.committed = False

    def __enter__(self) -> "FakeUnitOfWork":
        self._snapshot = (
            copy.deepcopy(self.store.users),
            copy.deepcopy(self.store.categories),
            self.store._seq,
        )
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if exc_type is not None:
            self._restore()

    def _restore(self) -> None:
        self.store.users, self.store.categories, self.store._seq = self._snapshot

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self._restore()


class FakeEventPublisher:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, object]]] = []

    def publish(self, name: str, **metadata: object) -> None:
        self.events.append((name, metadata))

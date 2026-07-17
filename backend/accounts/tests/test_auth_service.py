"""AuthService use-case tests with in-memory fakes (no DB — fast)."""

import pytest

from accounts.application.commands import Login, Register
from accounts.application.services import AuthService
from accounts.domain.exceptions import (
    EmailAlreadyRegistered,
    InvalidCredentials,
    WeakPassword,
)

from .fakes import (
    FakeCategorySeeder,
    FakeEventPublisher,
    FakePasswordPolicy,
    FakeStore,
    FakeTokenIssuer,
    FakeUnitOfWork,
    FakeUserRepository,
)


def build_service(
    store: FakeStore | None = None, *, seed_fails: bool = False
) -> tuple[AuthService, FakeStore, FakeTokenIssuer, FakeEventPublisher]:
    store = store or FakeStore()
    tokens = FakeTokenIssuer()
    events = FakeEventPublisher()
    service = AuthService(
        users=FakeUserRepository(store),
        tokens=tokens,
        seeder=FakeCategorySeeder(store, fail=seed_fails),
        password_policy=FakePasswordPolicy(),
        uow=FakeUnitOfWork(store),
        events=events,
    )
    return service, store, tokens, events


def test_register_creates_user_seeds_three_categories_and_issues_token() -> None:
    # covers 1.2, 1.5
    service, store, tokens, events = build_service()

    result = service.register(Register(email="New@Friend.com", password="s3cretpw!"))

    assert result.user.email == "new@friend.com"  # normalized
    assert result.token == tokens.issued[result.user.id]
    assert store.categories[result.user.id] == [
        "Random Thoughts",
        "School",
        "Personal",
    ]
    assert events.events[0][0] == "user.registered"


def test_register_rejects_duplicate_email() -> None:
    # covers 1.3
    service, _store, _tokens, _events = build_service()
    service.register(Register(email="a@b.com", password="s3cretpw!"))

    with pytest.raises(EmailAlreadyRegistered):
        service.register(Register(email="A@B.com", password="another8"))


def test_register_rejects_password_failing_policy() -> None:
    # covers 1.3
    service, store, _tokens, events = build_service()

    with pytest.raises(WeakPassword):
        service.register(Register(email="a@b.com", password="short"))

    assert store.users == {}  # no account created
    assert events.events == []


def test_register_is_atomic_when_seeding_fails() -> None:
    # covers 1.5 — "failure seeds nothing" (and no user, no token, no event)
    service, store, tokens, events = build_service(seed_fails=True)

    with pytest.raises(RuntimeError):
        service.register(Register(email="a@b.com", password="s3cretpw!"))

    assert store.users == {}
    assert store.categories == {}
    assert tokens.issued == {}
    assert events.events == []


def test_login_returns_token_for_valid_credentials() -> None:
    # covers 2.2
    store = FakeStore()
    service, _store, tokens, events = build_service(store)
    service.register(Register(email="a@b.com", password="s3cretpw!"))
    events.events.clear()

    result = service.login(Login(email="A@b.com", password="s3cretpw!"))

    assert result.token == tokens.issued[result.user.id]
    assert events.events[0][0] == "user.logged_in"


def test_login_rejects_bad_credentials() -> None:
    # covers 2.3
    store = FakeStore()
    service, _store, _tokens, _events = build_service(store)
    service.register(Register(email="a@b.com", password="s3cretpw!"))

    with pytest.raises(InvalidCredentials):
        service.login(Login(email="a@b.com", password="wrongpass"))


def test_logout_revokes_the_token() -> None:
    # covers logout (resolved open question)
    store = FakeStore()
    service, _store, tokens, _events = build_service(store)
    result = service.register(Register(email="a@b.com", password="s3cretpw!"))

    service.logout(result.user.id)

    assert result.user.id in tokens.revoked
    assert result.user.id not in tokens.issued

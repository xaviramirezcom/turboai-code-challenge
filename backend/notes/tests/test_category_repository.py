"""DjangoCategoryRepository round-trips domain entities (integration, DB)."""

import pytest
from django.contrib.auth import get_user_model

from notes.domain.entities import Category
from notes.infrastructure.repositories import DjangoCategoryRepository


@pytest.mark.django_db
def test_add_persists_and_returns_a_domain_entity() -> None:
    user = get_user_model().objects.create_user(username="a@b.com", password="pw")
    repo = DjangoCategoryRepository()

    saved = repo.add(
        Category(id=None, name="School", color="#F3DCA0", owner_id=user.pk)
    )

    assert saved.id is not None
    assert isinstance(saved, Category)
    assert saved.owner_id == user.pk

    listed = repo.list_for_owner(user.pk)
    assert [c.name for c in listed] == ["School"]


@pytest.mark.django_db
def test_list_is_scoped_to_the_owner() -> None:
    # covers 4.2 — a query only ever returns the requesting user's rows
    users = get_user_model().objects
    alice = users.create_user(username="alice@b.com", password="pw")
    bob = users.create_user(username="bob@b.com", password="pw")
    repo = DjangoCategoryRepository()
    repo.add(Category(id=None, name="Alice Only", color="#E7A67E", owner_id=alice.pk))
    repo.add(Category(id=None, name="Bob Only", color="#8FB8AC", owner_id=bob.pk))

    assert [c.name for c in repo.list_for_owner(alice.pk)] == ["Alice Only"]
    assert [c.name for c in repo.list_for_owner(bob.pk)] == ["Bob Only"]

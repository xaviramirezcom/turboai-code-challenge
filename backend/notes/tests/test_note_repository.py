"""DjangoNoteRepository / DjangoCategoryRepository round-trips (integration, DB)."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.db import transaction

from notes.domain.entities import Category, Note
from notes.domain.exceptions import CategoryNotFound, NoteNotFound
from notes.infrastructure.repositories import (
    DjangoCategoryRepository,
    DjangoNoteRepository,
)

pytestmark = pytest.mark.django_db

T0 = datetime(2024, 7, 21, 20, 39, tzinfo=UTC)


def _user(name: str):
    return get_user_model().objects.create_user(username=name, password="pw")


def _category(cat_repo: DjangoCategoryRepository, owner_id: int) -> int:
    cat = cat_repo.add(
        Category(id=None, name="Random Thoughts", color="#E7A67E", owner_id=owner_id)
    )
    assert cat.id is not None
    return cat.id


def test_add_and_get_round_trip() -> None:
    # covers 1.1, 1.2
    user = _user("a@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    category_id = _category(cats, user.pk)

    saved = notes.add(
        Note(
            id=None,
            title="Hi",
            content="body",
            category_id=category_id,
            owner_id=user.pk,
            last_edited_at=T0,
        )
    )
    assert saved.id is not None

    fetched = notes.get(saved.id, user.pk)
    assert isinstance(fetched, Note)
    assert fetched.title == "Hi"
    assert fetched.content == "body"
    assert fetched.category_id == category_id
    assert fetched.created_at is not None


def test_list_orders_by_last_edited_desc() -> None:
    # covers ordering (-last_edited_at)
    user = _user("a@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    category_id = _category(cats, user.pk)

    older = notes.add(
        Note(
            id=None,
            title="old",
            content="",
            category_id=category_id,
            owner_id=user.pk,
            last_edited_at=T0,
        )
    )
    newer = notes.add(
        Note(
            id=None,
            title="new",
            content="",
            category_id=category_id,
            owner_id=user.pk,
            last_edited_at=T0 + timedelta(minutes=5),
        )
    )

    listed = notes.list_for_owner(user.pk)
    assert [n.id for n in listed] == [newer.id, older.id]


def test_get_is_owner_scoped() -> None:
    # covers cross-user isolation
    alice = _user("alice@b.com")
    bob = _user("bob@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    note = notes.add(
        Note(
            id=None,
            title="secret",
            content="",
            category_id=_category(cats, alice.pk),
            owner_id=alice.pk,
            last_edited_at=T0,
        )
    )
    assert note.id is not None
    with pytest.raises(NoteNotFound):
        notes.get(note.id, bob.pk)


def test_get_for_update_locks_and_save_persists() -> None:
    # covers 2.1, 2.2 (edit path)
    user = _user("a@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    category_id = _category(cats, user.pk)
    note = notes.add(
        Note(
            id=None,
            title="",
            content="",
            category_id=category_id,
            owner_id=user.pk,
            last_edited_at=T0,
        )
    )
    assert note.id is not None

    with transaction.atomic():
        locked = notes.get_for_update(note.id, user.pk)
        locked.edit(now=T0 + timedelta(minutes=1), title="edited")
        notes.save(locked)

    reloaded = notes.get(note.id, user.pk)
    assert reloaded.title == "edited"
    assert reloaded.last_edited_at == T0 + timedelta(minutes=1)


def test_delete_is_owner_scoped() -> None:
    # covers delete
    user = _user("a@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    note = notes.add(
        Note(
            id=None,
            title="",
            content="",
            category_id=_category(cats, user.pk),
            owner_id=user.pk,
            last_edited_at=T0,
        )
    )
    assert note.id is not None
    notes.delete(note.id, user.pk)
    with pytest.raises(NoteNotFound):
        notes.get(note.id, user.pk)
    with pytest.raises(NoteNotFound):
        notes.delete(uuid4(), user.pk)


def test_category_default_and_ownership_lookups() -> None:
    # covers 1.2 default + 3.2 ownership validation
    alice = _user("alice@b.com")
    bob = _user("bob@b.com")
    cats = DjangoCategoryRepository()
    cats.add(
        Category(
            id=None, name="School", color="#F3DCA0", owner_id=alice.pk, is_default=False
        )
    )
    default = cats.add(
        Category(
            id=None,
            name="Random Thoughts",
            color="#E7A67E",
            owner_id=alice.pk,
            is_default=True,
        )
    )
    assert default.id is not None
    default_id: int = default.id

    assert cats.get_default_for_owner(alice.pk).id == default_id
    assert cats.get_for_owner(default_id, alice.pk) is not None
    assert cats.get_for_owner(default_id, bob.pk) is None

    with pytest.raises(CategoryNotFound):
        cats.get_default_for_owner(bob.pk)


def test_list_with_counts_is_correct_and_owner_scoped() -> None:
    # covers board 1.2 — annotated per-category note counts, scoped to the owner
    alice = _user("alice@b.com")
    bob = _user("bob@b.com")
    cats = DjangoCategoryRepository()
    notes = DjangoNoteRepository()
    a_random = _category(cats, alice.pk)
    a_school = cats.add(
        Category(id=None, name="School", color="#FCDC94", owner_id=alice.pk)
    ).id
    _category(cats, bob.pk)  # bob's own category

    for _ in range(2):
        notes.add(
            Note(
                id=None,
                title="",
                content="",
                category_id=a_random,
                owner_id=alice.pk,
                last_edited_at=T0,
            )
        )
    notes.add(
        Note(
            id=None,
            title="",
            content="",
            category_id=a_school,
            owner_id=alice.pk,
            last_edited_at=T0,
        )
    )

    counts = {c.category.name: c.note_count for c in cats.list_with_counts(alice.pk)}
    assert counts == {"Random Thoughts": 2, "School": 1}
    # bob sees only his own (empty) category
    assert [c.note_count for c in cats.list_with_counts(bob.pk)] == [0]

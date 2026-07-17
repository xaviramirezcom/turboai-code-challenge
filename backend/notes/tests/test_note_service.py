"""NoteService use-case tests with in-memory fakes (no DB — fast)."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from notes.application.commands import CreateNote, UpdateNote
from notes.application.services import CategoryService, NoteService
from notes.domain.exceptions import ForeignCategory, NoteNotFound

from .fakes import (
    FakeCategoryRepository,
    FakeClock,
    FakeEventPublisher,
    FakeNoteRepository,
    FakeUnitOfWork,
)

T0 = datetime(2024, 7, 21, 20, 39, tzinfo=UTC)
OWNER = 1
OTHER = 2


def build() -> (
    tuple[NoteService, FakeCategoryRepository, FakeEventPublisher, FakeClock]
):
    categories = FakeCategoryRepository()
    categories.seed(OWNER, "Random Thoughts", "#E7A67E", is_default=True)
    categories.seed(OWNER, "School", "#F3DCA0", is_default=True)
    categories.seed(OTHER, "Personal", "#8FB8AC", is_default=True)
    events = FakeEventPublisher()
    clock = FakeClock(T0)
    service = NoteService(
        notes=FakeNoteRepository(),
        categories=categories,
        uow=FakeUnitOfWork(),
        events=events,
        clock=clock,
    )
    return service, categories, events, clock


def test_create_assigns_default_category_and_timestamps() -> None:
    # covers 1.1, 1.2
    service, _cats, events, _clock = build()

    note = service.create(CreateNote(owner_id=OWNER))

    assert note.id is not None
    assert note.title == ""
    assert note.content == ""
    assert note.category_id == 1  # first default (Random Thoughts)
    assert note.created_at == T0
    assert note.last_edited_at == T0
    assert events.events[0][0] == "note.created"


def test_create_with_explicit_owned_category() -> None:
    # covers 1.2
    service, _cats, _events, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER, category_id=2))
    assert note.category_id == 2


def test_create_rejects_a_category_the_user_does_not_own() -> None:
    # covers 3.2 (ownership validation)
    service, _cats, _events, _clock = build()
    with pytest.raises(ForeignCategory):
        service.create(CreateNote(owner_id=OWNER, category_id=3))  # OTHER's category


def test_update_coalesces_fields_and_bumps_last_edited_at() -> None:
    # covers 2.1, 2.2
    service, _cats, _events, clock = build()
    note = service.create(CreateNote(owner_id=OWNER))

    clock.advance(60)
    service.update(UpdateNote(owner_id=OWNER, note_id=note.id, title="My Note"))
    clock.advance(60)
    updated = service.update(
        UpdateNote(owner_id=OWNER, note_id=note.id, content="body text")
    )

    assert updated.title == "My Note"  # earlier edit preserved
    assert updated.content == "body text"
    assert updated.last_edited_at is not None
    assert updated.last_edited_at > T0


def test_update_changes_category_and_bumps_timestamp() -> None:
    # covers 3.2
    service, _cats, _events, clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    clock.advance(30)

    updated = service.update(UpdateNote(owner_id=OWNER, note_id=note.id, category_id=2))

    assert updated.category_id == 2
    assert updated.last_edited_at is not None and updated.last_edited_at > T0


def test_update_rejects_a_foreign_category() -> None:
    # covers 3.2
    service, _cats, _events, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    with pytest.raises(ForeignCategory):
        service.update(UpdateNote(owner_id=OWNER, note_id=note.id, category_id=3))


def test_get_and_update_are_owner_scoped() -> None:
    # covers 5.2 scoping (a user never touches another's note)
    service, _cats, _events, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    with pytest.raises(NoteNotFound):
        service.get(OTHER, note.id)
    with pytest.raises(NoteNotFound):
        service.update(UpdateNote(owner_id=OTHER, note_id=note.id, title="x"))


def test_list_orders_by_most_recently_edited_first() -> None:
    # covers list ordering (board consumes this)
    service, _cats, _events, clock = build()
    first = service.create(CreateNote(owner_id=OWNER))
    clock.advance(60)
    second = service.create(CreateNote(owner_id=OWNER))

    ids = [n.id for n in service.list(OWNER)]
    assert ids == [second.id, first.id]


def test_delete_removes_the_note() -> None:
    # covers delete (resolved open question)
    service, _cats, events, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))

    service.delete(OWNER, note.id)

    with pytest.raises(NoteNotFound):
        service.get(OWNER, note.id)
    assert events.events[-1][0] == "note.deleted"


def test_delete_missing_note_raises() -> None:
    # covers delete unhappy path
    service, _cats, _events, _clock = build()
    with pytest.raises(NoteNotFound):
        service.delete(OWNER, uuid4())


def test_category_service_lists_only_the_owners_categories() -> None:
    # covers 3.1 (editor dropdown data) + /api/categories ownership
    _service, categories, _events, _clock = build()
    cat_service = CategoryService(categories=categories)
    names = [c.name for c in cat_service.list(OWNER)]
    assert names == ["Random Thoughts", "School"]

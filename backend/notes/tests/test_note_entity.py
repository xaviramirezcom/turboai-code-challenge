"""Note domain invariants and behaviour (pure unit — no DB)."""

from datetime import UTC, datetime
from uuid import uuid4

from notes.domain.entities import Note

T0 = datetime(2024, 7, 21, 20, 39, tzinfo=UTC)
T1 = datetime(2024, 7, 21, 20, 45, tzinfo=UTC)


def _note() -> Note:
    return Note(
        id=uuid4(),
        title="",
        content="",
        category_id=1,
        owner_id=1,
        created_at=T0,
        last_edited_at=T0,
    )


def test_note_may_be_created_empty() -> None:
    # covers 1.2 / 1.3 — empty title and content are valid
    note = _note()
    assert note.title == ""
    assert note.content == ""


def test_edit_updates_fields_and_bumps_last_edited_at() -> None:
    # covers 2.2
    note = _note()
    note.edit(now=T1, title="Hello", content="World")
    assert note.title == "Hello"
    assert note.content == "World"
    assert note.last_edited_at == T1


def test_edit_with_only_content_leaves_title_untouched() -> None:
    # covers 2.2 — partial edits coalesce field-by-field
    note = _note()
    note.title = "Keep"
    note.edit(now=T1, content="only body")
    assert note.title == "Keep"
    assert note.content == "only body"
    assert note.last_edited_at == T1


def test_set_category_changes_category_and_bumps_last_edited_at() -> None:
    # covers 3.2
    note = _note()
    note.set_category(7, now=T1)
    assert note.category_id == 7
    assert note.last_edited_at == T1

"""Optimistic version + advisory session-lock use cases (fakes, no DB)."""

from datetime import UTC, datetime

import pytest

from notes.application.commands import CreateNote, UpdateNote
from notes.application.services import LOCK_TTL, NoteService
from notes.domain.exceptions import NoteLocked, VersionConflict

from .fakes import (
    FakeCategoryRepository,
    FakeClock,
    FakeEventPublisher,
    FakeNoteRepository,
    FakeUnitOfWork,
)

UTC = UTC
T0 = datetime(2024, 7, 21, 20, 0, tzinfo=UTC)
OWNER = 1
TAB_A, TAB_B = "session-a", "session-b"


def build() -> tuple[NoteService, FakeClock]:
    cats = FakeCategoryRepository()
    cats.seed(OWNER, "Random Thoughts", "#EF9C66", is_default=True)
    clock = FakeClock(T0)
    service = NoteService(
        notes=FakeNoteRepository(),
        categories=cats,
        uow=FakeUnitOfWork(),
        events=FakeEventPublisher(),
        clock=clock,
    )
    return service, clock


def test_each_write_bumps_the_version() -> None:
    # covers 6.1
    service, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    assert note.version == 1

    updated = service.update(UpdateNote(owner_id=OWNER, note_id=note.id, title="a"))
    assert updated.version == 2
    updated = service.update(UpdateNote(owner_id=OWNER, note_id=note.id, content="b"))
    assert updated.version == 3


def test_stale_base_version_raises_version_conflict_with_current() -> None:
    # covers 6.2
    service, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    service.update(
        UpdateNote(owner_id=OWNER, note_id=note.id, title="x", base_version=1)
    )

    with pytest.raises(VersionConflict) as exc:
        service.update(
            UpdateNote(owner_id=OWNER, note_id=note.id, title="y", base_version=1)
        )
    assert exc.value.current.version == 2  # current server note returned


def test_matching_base_version_succeeds() -> None:
    # covers 6.2 happy path
    service, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    updated = service.update(
        UpdateNote(owner_id=OWNER, note_id=note.id, title="ok", base_version=1)
    )
    assert updated.title == "ok"


def test_lock_blocks_a_different_session_from_locking_and_editing() -> None:
    # covers 5.1, 5.2
    service, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))

    service.lock(OWNER, note.id, TAB_A)

    with pytest.raises(NoteLocked):
        service.lock(OWNER, note.id, TAB_B)
    with pytest.raises(NoteLocked):
        service.update(
            UpdateNote(owner_id=OWNER, note_id=note.id, title="z", session_id=TAB_B)
        )
    # the holding session can still edit
    ok = service.update(
        UpdateNote(owner_id=OWNER, note_id=note.id, title="mine", session_id=TAB_A)
    )
    assert ok.title == "mine"


def test_unlock_frees_the_note_for_another_session() -> None:
    # covers 5.4
    service, _clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    service.lock(OWNER, note.id, TAB_A)
    service.unlock(OWNER, note.id, TAB_A)

    # another session may now lock
    locked = service.lock(OWNER, note.id, TAB_B)
    assert locked.locked_by == TAB_B


def test_expired_lock_lets_another_session_take_over() -> None:
    # covers 5.3 — a stopped session's lock expires
    service, clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    service.lock(OWNER, note.id, TAB_A)

    clock.advance(int(LOCK_TTL.total_seconds()) + 1)

    taken = service.lock(OWNER, note.id, TAB_B)
    assert taken.locked_by == TAB_B


def test_heartbeat_extends_the_lock() -> None:
    # covers 5.3
    service, clock = build()
    note = service.create(CreateNote(owner_id=OWNER))
    locked = service.lock(OWNER, note.id, TAB_A)
    first_expiry = locked.lock_expires_at

    clock.advance(10)
    refreshed = service.heartbeat(OWNER, note.id, TAB_A)
    assert refreshed.lock_expires_at is not None
    assert first_expiry is not None
    assert refreshed.lock_expires_at > first_expiry

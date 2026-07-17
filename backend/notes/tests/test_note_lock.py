"""Note advisory-lock + version behaviour (pure unit — no DB)."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from notes.domain.entities import Note

UTC = UTC
NOW = datetime(2024, 7, 21, 20, 0, tzinfo=UTC)
TTL = timedelta(seconds=30)
ALICE, BOB = "sess-a", "sess-b"  # editing-session tokens (not users)


def _note() -> Note:
    return Note(
        id=uuid4(),
        title="",
        content="",
        category_id=1,
        owner_id=1,
        last_edited_at=NOW,
    )


def test_new_note_starts_at_version_one_and_bumps() -> None:
    # covers 6.1
    note = _note()
    assert note.version == 1
    note.bump_version()
    note.bump_version()
    assert note.version == 3


def test_acquire_lock_sets_holder_and_expiry() -> None:
    # covers 5.1
    note = _note()
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    assert note.locked_by == ALICE
    assert note.lock_expires_at == NOW + TTL


def test_unlocked_or_self_locked_is_not_locked_by_other() -> None:
    # covers 5.1 / 5.2 negative
    note = _note()
    assert note.is_locked_by_other(BOB, NOW) is False
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    assert note.is_locked_by_other(ALICE, NOW) is False  # holder itself


def test_locked_by_other_while_unexpired() -> None:
    # covers 5.2
    note = _note()
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    assert note.is_locked_by_other(BOB, NOW + timedelta(seconds=10)) is True


def test_expired_lock_is_free_again() -> None:
    # covers 5.3 — a stopped client's lock expires, note becomes editable
    note = _note()
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    assert note.is_locked_by_other(BOB, NOW + timedelta(seconds=31)) is False


def test_refresh_extends_only_for_the_holder() -> None:
    # covers 5.3
    note = _note()
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    note.refresh_lock(BOB, now=NOW + timedelta(seconds=5), ttl=TTL)
    assert note.lock_expires_at == NOW + TTL  # unchanged for non-holder
    note.refresh_lock(ALICE, now=NOW + timedelta(seconds=5), ttl=TTL)
    assert note.lock_expires_at == NOW + timedelta(seconds=5) + TTL


def test_release_clears_the_lock() -> None:
    # covers 5.4
    note = _note()
    note.acquire_lock(ALICE, now=NOW, ttl=TTL)
    note.release_lock()
    assert note.locked_by is None
    assert note.lock_expires_at is None
    assert note.is_locked_by_other(BOB, NOW) is False

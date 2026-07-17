"""Domain entities for the notes context. Pure Python — no framework imports."""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from .exceptions import InvalidCategory

_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


@dataclass
class Category:
    """A note category. Its colour tints the board card and editor background."""

    id: int | None
    name: str
    color: str
    owner_id: int
    is_default: bool = False

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise InvalidCategory("category name must not be empty")
        self.name = self.name.strip()
        if not _HEX_COLOR.match(self.color):
            raise InvalidCategory(f"colour must be a #RRGGBB hex, got {self.color!r}")


@dataclass(frozen=True)
class CategoryWithCount:
    """A category plus its total note count — the board sidebar read model (1.2)."""

    category: Category
    note_count: int


@dataclass(frozen=True)
class NoteView:
    """A note plus its category — the read projection for API serialization,
    fetched in one ``select_related`` query so no second round-trip is needed.
    Lock state (session token + expiry) travels on ``note`` itself."""

    note: "Note"
    category: Category


@dataclass
class Note:
    """A note. Title and content MAY be empty (created empty, filled later).

    A note always has a category (assigned on create). ``last_edited_at`` is
    bumped explicitly by ``edit``/``set_category`` with a caller-supplied clock
    so the service controls the timestamp (deterministic, testable).
    """

    id: UUID | None
    title: str
    content: str
    category_id: int
    owner_id: int
    created_at: datetime | None = None
    last_edited_at: datetime | None = None
    # Collaboration (specs/collaboration): optimistic concurrency + advisory lock.
    # The lock holder is a client SESSION token (a user's two tabs/devices are
    # distinct sessions), so a single owner's concurrent sessions block each other.
    version: int = 1
    locked_by: str | None = None
    lock_expires_at: datetime | None = None

    def edit(
        self,
        *,
        now: datetime,
        title: str | None = None,
        content: str | None = None,
    ) -> None:
        """Apply a title and/or content change and bump ``last_edited_at`` (2.2)."""
        if title is not None:
            self.title = title
        if content is not None:
            self.content = content
        self.last_edited_at = now

    def set_category(self, category_id: int, *, now: datetime) -> None:
        """Move the note to another category and bump ``last_edited_at`` (3.2)."""
        self.category_id = category_id
        self.last_edited_at = now

    # --- Collaboration behaviour ---------------------------------------

    def bump_version(self) -> None:
        """Increment the version on every server-side write (6.1)."""
        self.version += 1

    def is_locked_by_other(self, session_id: str, now: datetime) -> bool:
        """True if a different session holds an unexpired advisory lock (5.2)."""
        return (
            self.locked_by is not None
            and self.locked_by != session_id
            and self.lock_expires_at is not None
            and self.lock_expires_at > now
        )

    def acquire_lock(self, session_id: str, *, now: datetime, ttl: timedelta) -> None:
        """Take (or re-take) the lock for ``session_id`` (5.1). Callers must first
        check ``is_locked_by_other`` and reject if it holds."""
        self.locked_by = session_id
        self.lock_expires_at = now + ttl

    def refresh_lock(self, session_id: str, *, now: datetime, ttl: timedelta) -> None:
        """Extend the lock's expiry, but only while ``session_id`` holds it (5.3)."""
        if self.locked_by == session_id:
            self.lock_expires_at = now + ttl

    def release_lock(self) -> None:
        """Clear the advisory lock (5.4)."""
        self.locked_by = None
        self.lock_expires_at = None

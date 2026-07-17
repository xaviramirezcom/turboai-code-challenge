"""Domain entities for the notes context. Pure Python — no framework imports."""

import re
from dataclasses import dataclass
from datetime import datetime
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

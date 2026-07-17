"""Command DTOs crossing the application boundary."""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CreateNote:
    owner_id: int
    category_id: int | None = None  # None → the owner's default category (1.2)
    note_id: UUID | None = None  # client UUID for idempotent offline create (3.4)


@dataclass(frozen=True)
class UpdateNote:
    owner_id: int
    note_id: UUID
    title: str | None = None
    content: str | None = None
    category_id: int | None = None
    base_version: int | None = None  # optimistic concurrency (6.2); None = skip check
    session_id: str | None = None  # editing session; blocks a different session (5.2)

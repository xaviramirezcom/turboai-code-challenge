"""Command DTOs crossing the application boundary."""

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CreateNote:
    owner_id: int
    category_id: int | None = None  # None → the owner's default category (1.2)


@dataclass(frozen=True)
class UpdateNote:
    owner_id: int
    note_id: UUID
    title: str | None = None
    content: str | None = None
    category_id: int | None = None

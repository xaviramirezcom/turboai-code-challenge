"""Repository ports (abstract) for the notes context."""

from abc import ABC, abstractmethod
from uuid import UUID

from .entities import Category, CategoryWithCount, Note, NoteView


class CategoryRepository(ABC):
    @abstractmethod
    def add(self, category: Category) -> Category: ...

    @abstractmethod
    def list_for_owner(self, owner_id: int) -> list[Category]: ...

    @abstractmethod
    def list_with_counts(self, owner_id: int) -> list[CategoryWithCount]:
        """The owner's categories, each with its total note count (board 1.2)."""

    @abstractmethod
    def get_default_for_owner(self, owner_id: int) -> Category:
        """The owner's default category for a new note. Raises CategoryNotFound."""

    @abstractmethod
    def get_for_owner(self, category_id: int, owner_id: int) -> Category | None:
        """The owner's category by id, or None if it isn't theirs (3.2 validation)."""


class NoteRepository(ABC):
    @abstractmethod
    def add(self, note: Note) -> Note: ...

    @abstractmethod
    def get(self, note_id: UUID, owner_id: int) -> Note:
        """Owner-scoped read. Raises NoteNotFound."""

    @abstractmethod
    def get_for_update(self, note_id: UUID, owner_id: int) -> Note:
        """Owner-scoped, row-locked read for a mutation. Raises NoteNotFound."""

    @abstractmethod
    def save(self, note: Note) -> Note: ...

    @abstractmethod
    def list_for_owner(
        self, owner_id: int, category_id: int | None = None
    ) -> list[Note]: ...

    @abstractmethod
    def list_for_owner_with_category(
        self, owner_id: int, category_id: int | None = None
    ) -> list[NoteView]:
        """Owner-scoped list with each note's category joined (one query)."""

    @abstractmethod
    def get_with_category(self, note_id: UUID, owner_id: int) -> NoteView:
        """Owner-scoped read with the category joined. Raises NoteNotFound."""

    @abstractmethod
    def delete(self, note_id: UUID, owner_id: int) -> None:
        """Owner-scoped delete. Raises NoteNotFound."""

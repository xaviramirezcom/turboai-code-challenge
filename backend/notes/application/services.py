"""Notes use cases. Framework-free: orchestrate the domain through ports and own
the transaction boundary. No Django imports.
"""

from uuid import UUID

from ..domain.entities import Category, CategoryWithCount, Note, NoteView
from ..domain.exceptions import CategoryNotFound, ForeignCategory
from ..domain.repositories import CategoryRepository, NoteRepository
from .commands import CreateNote, UpdateNote
from .ports import Clock, EventPublisher, UnitOfWork

# Module-scope aliases: a `list` method shadows builtin `list` inside the class
# body, so annotate list-returning methods defined after it via an alias.
CategoryCountList = list[CategoryWithCount]
NoteViewList = list[NoteView]


class NoteService:
    def __init__(
        self,
        *,
        notes: NoteRepository,
        categories: CategoryRepository,
        uow: UnitOfWork,
        events: EventPublisher,
        clock: Clock,
    ) -> None:
        self._notes = notes
        self._categories = categories
        self._uow = uow
        self._events = events
        self._clock = clock

    def _resolve_owned_category_id(self, category_id: int, owner_id: int) -> int:
        category = self._categories.get_for_owner(category_id, owner_id)
        if category is None:
            raise ForeignCategory(str(category_id))
        assert category.id is not None
        return category.id

    def create(self, cmd: CreateNote) -> Note:
        now = self._clock.now()
        if cmd.category_id is not None:
            category_id = self._resolve_owned_category_id(cmd.category_id, cmd.owner_id)
        else:
            default = self._categories.get_default_for_owner(cmd.owner_id)
            assert default.id is not None
            category_id = default.id

        with self._uow as uow:
            note = self._notes.add(
                Note(
                    id=None,
                    title="",
                    content="",
                    category_id=category_id,
                    owner_id=cmd.owner_id,
                    created_at=now,
                    last_edited_at=now,
                )
            )
            uow.commit()

        self._events.publish(
            "note.created",
            actor=str(cmd.owner_id),
            entity_type="Note",
            entity_id=note.id,
        )
        return note

    def update(self, cmd: UpdateNote) -> Note:
        now = self._clock.now()
        with self._uow as uow:
            note = self._notes.get_for_update(cmd.note_id, cmd.owner_id)
            if cmd.category_id is not None:
                category_id = self._resolve_owned_category_id(
                    cmd.category_id, cmd.owner_id
                )
                note.set_category(category_id, now=now)
            if cmd.title is not None or cmd.content is not None:
                note.edit(now=now, title=cmd.title, content=cmd.content)
            note = self._notes.save(note)
            uow.commit()

        self._events.publish(
            "note.updated",
            actor=str(cmd.owner_id),
            entity_type="Note",
            entity_id=note.id,
        )
        return note

    def get(self, owner_id: int, note_id: UUID) -> Note:
        return self._notes.get(note_id, owner_id)

    def get_with_category(self, owner_id: int, note_id: UUID) -> NoteView:
        return self._notes.get_with_category(note_id, owner_id)

    def list(self, owner_id: int, category_id: int | None = None) -> list[Note]:
        return self._notes.list_for_owner(owner_id, category_id)

    def list_with_category(
        self, owner_id: int, category_id: int | None = None
    ) -> NoteViewList:
        return self._notes.list_for_owner_with_category(owner_id, category_id)

    def delete(self, owner_id: int, note_id: UUID) -> None:
        with self._uow as uow:
            self._notes.delete(note_id, owner_id)
            uow.commit()
        self._events.publish(
            "note.deleted",
            actor=str(owner_id),
            entity_type="Note",
            entity_id=note_id,
        )


class CategoryService:
    """Lists the owner's categories (editor dropdown 3.1, board sidebar)."""

    def __init__(self, *, categories: CategoryRepository) -> None:
        self._categories = categories

    def list(self, owner_id: int) -> list[Category]:
        return self._categories.list_for_owner(owner_id)

    def list_with_counts(self, owner_id: int) -> CategoryCountList:
        return self._categories.list_with_counts(owner_id)

    def get(self, owner_id: int, category_id: int) -> Category:
        category = self._categories.get_for_owner(category_id, owner_id)
        if category is None:
            raise CategoryNotFound(str(category_id))
        return category

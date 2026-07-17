"""Notes use cases. Framework-free: orchestrate the domain through ports and own
the transaction boundary. No Django imports.
"""

from datetime import datetime, timedelta
from uuid import UUID

from ..domain.entities import Category, CategoryWithCount, Note, NoteView
from ..domain.exceptions import (
    CategoryNotFound,
    ForeignCategory,
    NoteLocked,
    NoteNotFound,
    VersionConflict,
)
from ..domain.repositories import CategoryRepository, NoteRepository
from .commands import CreateNote, UpdateNote
from .ports import Clock, EventPublisher, UnitOfWork

# Advisory lock TTL (open question resolved: 30s TTL, client heartbeats every 10s).
LOCK_TTL = timedelta(seconds=30)

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
        # Idempotent offline create (3.4): a replayed create with the same client
        # UUID returns the existing note instead of duplicating it.
        if cmd.note_id is not None:
            try:
                return self._notes.get(cmd.note_id, cmd.owner_id)
            except NoteNotFound:
                pass
        if cmd.category_id is not None:
            category_id = self._resolve_owned_category_id(cmd.category_id, cmd.owner_id)
        else:
            default = self._categories.get_default_for_owner(cmd.owner_id)
            assert default.id is not None
            category_id = default.id

        with self._uow as uow:
            note = self._notes.add(
                Note(
                    id=cmd.note_id,
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
            # Advisory lock (5.2) then optimistic version (6.2), both under the
            # row lock so concurrent writers are serialised.
            if cmd.session_id is not None and note.is_locked_by_other(
                cmd.session_id, now
            ):
                assert note.locked_by is not None
                raise NoteLocked(note.locked_by, note.lock_expires_at)
            if cmd.base_version is not None and cmd.base_version != note.version:
                raise VersionConflict(note)
            if cmd.category_id is not None:
                category_id = self._resolve_owned_category_id(
                    cmd.category_id, cmd.owner_id
                )
                note.set_category(category_id, now=now)
            if cmd.title is not None or cmd.content is not None:
                note.edit(now=now, title=cmd.title, content=cmd.content)
            note.bump_version()  # every server-side write (6.1)
            note = self._notes.save(note)
            uow.commit()

        self._events.publish(
            "note.updated",
            actor=str(cmd.owner_id),
            entity_type="Note",
            entity_id=note.id,
        )
        return note

    def lock(self, owner_id: int, note_id: UUID, session_id: str) -> Note:
        """Acquire the advisory lock (5.1); raise NoteLocked if another session
        holds it."""
        now = self._clock.now()
        with self._uow as uow:
            note = self._notes.get_for_update(note_id, owner_id)
            if note.is_locked_by_other(session_id, now):
                assert note.locked_by is not None
                raise NoteLocked(note.locked_by, note.lock_expires_at)
            note.acquire_lock(session_id, now=now, ttl=LOCK_TTL)
            note = self._notes.save(note)
            uow.commit()
        self._events.publish(
            "note.locked", actor=str(owner_id), entity_type="Note", entity_id=note_id
        )
        return note

    def heartbeat(self, owner_id: int, note_id: UUID, session_id: str) -> Note:
        """Extend the lock TTL (5.3). Raise NoteLocked if another session holds it."""
        now = self._clock.now()
        with self._uow as uow:
            note = self._notes.get_for_update(note_id, owner_id)
            if note.is_locked_by_other(session_id, now):
                assert note.locked_by is not None
                raise NoteLocked(note.locked_by, note.lock_expires_at)
            note.acquire_lock(session_id, now=now, ttl=LOCK_TTL)
            note = self._notes.save(note)
            uow.commit()
        return note

    def unlock(self, owner_id: int, note_id: UUID, session_id: str) -> None:
        """Release the lock if this session holds it (5.4). Idempotent otherwise."""
        with self._uow as uow:
            note = self._notes.get_for_update(note_id, owner_id)
            if note.locked_by == session_id:
                note.release_lock()
                self._notes.save(note)
            uow.commit()
        self._events.publish(
            "note.unlocked", actor=str(owner_id), entity_type="Note", entity_id=note_id
        )

    def get(self, owner_id: int, note_id: UUID) -> Note:
        return self._notes.get(note_id, owner_id)

    def get_with_category(self, owner_id: int, note_id: UUID) -> NoteView:
        return self._notes.get_with_category(note_id, owner_id)

    def list(self, owner_id: int, category_id: int | None = None) -> list[Note]:
        return self._notes.list_for_owner(owner_id, category_id)

    def list_with_category(
        self,
        owner_id: int,
        category_id: int | None = None,
        since: datetime | None = None,
    ) -> NoteViewList:
        return self._notes.list_for_owner_with_category(owner_id, category_id, since)

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

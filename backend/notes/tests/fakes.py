"""In-memory port fakes for fast, DB-free notes use-case tests."""

from datetime import datetime, timedelta
from types import TracebackType
from uuid import UUID, uuid4

from notes.domain.entities import Category, Note
from notes.domain.exceptions import CategoryNotFound, NoteNotFound


class FakeCategoryRepository:
    def __init__(self) -> None:
        self._items: dict[int, Category] = {}
        self._seq = 0

    def seed(
        self, owner_id: int, name: str, color: str, *, is_default: bool
    ) -> Category:
        self._seq += 1
        cat = Category(
            id=self._seq,
            name=name,
            color=color,
            owner_id=owner_id,
            is_default=is_default,
        )
        self._items[self._seq] = cat
        return cat

    def add(self, category: Category) -> Category:
        self._seq += 1
        stored = Category(
            id=self._seq,
            name=category.name,
            color=category.color,
            owner_id=category.owner_id,
            is_default=category.is_default,
        )
        self._items[self._seq] = stored
        return stored

    def list_for_owner(self, owner_id: int) -> list[Category]:
        return [c for c in self._items.values() if c.owner_id == owner_id]

    def get_default_for_owner(self, owner_id: int) -> Category:
        for cat in self._items.values():
            if cat.owner_id == owner_id and cat.is_default:
                return cat
        raise CategoryNotFound(str(owner_id))

    def get_for_owner(self, category_id: int, owner_id: int) -> Category | None:
        cat = self._items.get(category_id)
        if cat is None or cat.owner_id != owner_id:
            return None
        return cat


class FakeNoteRepository:
    def __init__(self) -> None:
        self._items: dict[UUID, Note] = {}

    def add(self, note: Note) -> Note:
        note.id = uuid4()
        self._items[note.id] = note
        return note

    def get(self, note_id: UUID, owner_id: int) -> Note:
        note = self._items.get(note_id)
        if note is None or note.owner_id != owner_id:
            raise NoteNotFound(str(note_id))
        return note

    def get_for_update(self, note_id: UUID, owner_id: int) -> Note:
        return self.get(note_id, owner_id)

    def save(self, note: Note) -> Note:
        assert note.id is not None
        self._items[note.id] = note
        return note

    def list_for_owner(
        self, owner_id: int, category_id: int | None = None
    ) -> list[Note]:
        notes = [n for n in self._items.values() if n.owner_id == owner_id]
        if category_id is not None:
            notes = [n for n in notes if n.category_id == category_id]
        return sorted(
            notes,
            key=lambda n: n.last_edited_at or datetime.min,
            reverse=True,
        )

    def delete(self, note_id: UUID, owner_id: int) -> None:
        note = self._items.get(note_id)
        if note is None or note.owner_id != owner_id:
            raise NoteNotFound(str(note_id))
        del self._items[note_id]


class FakeUnitOfWork:
    def __enter__(self) -> "FakeUnitOfWork":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        return None

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None


class FakeEventPublisher:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, object]]] = []

    def publish(self, name: str, **metadata: object) -> None:
        self.events.append((name, metadata))


class FakeClock:
    def __init__(self, start: datetime) -> None:
        self._now = start

    def now(self) -> datetime:
        return self._now

    def advance(self, seconds: int) -> None:
        self._now += timedelta(seconds=seconds)

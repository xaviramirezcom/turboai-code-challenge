"""Django adapters implementing the notes repository ports.

Repositories return domain entities, never ORM objects.
"""

from uuid import UUID

from django.db.models import Count

from ..domain.entities import Category, CategoryWithCount, Note
from ..domain.exceptions import CategoryNotFound, NoteNotFound
from ..domain.repositories import CategoryRepository, NoteRepository
from .mappers import category_to_domain, note_to_domain
from .models import CategoryORM, NoteORM


class DjangoCategoryRepository(CategoryRepository):
    def add(self, category: Category) -> Category:
        orm = CategoryORM.objects.create(
            name=category.name,
            color=category.color,
            owner_id=category.owner_id,
            is_default=category.is_default,
        )
        return category_to_domain(orm)

    def list_for_owner(self, owner_id: int) -> list[Category]:
        return [
            category_to_domain(orm)
            for orm in CategoryORM.objects.filter(owner_id=owner_id)
        ]

    def list_with_counts(self, owner_id: int) -> list[CategoryWithCount]:
        # One annotated query (not per-row). `.values()` keeps the count off the
        # ORM instance so it maps cleanly to the domain read model.
        # Explicit order_by: annotate() + values() drops Meta.ordering, so pin the
        # seeded order (id asc = Random Thoughts, School, Personal) deterministically.
        rows = (
            CategoryORM.objects.filter(owner_id=owner_id)
            .annotate(note_count=Count("notes"))
            .values("id", "name", "color", "is_default", "note_count")
            .order_by("id")
        )
        return [
            CategoryWithCount(
                category=Category(
                    id=row["id"],
                    name=row["name"],
                    color=row["color"],
                    owner_id=owner_id,
                    is_default=row["is_default"],
                ),
                note_count=row["note_count"],
            )
            for row in rows
        ]

    def get_default_for_owner(self, owner_id: int) -> Category:
        orm = (
            CategoryORM.objects.filter(owner_id=owner_id, is_default=True)
            .order_by("id")
            .first()
        )
        if orm is None:
            raise CategoryNotFound(str(owner_id))
        return category_to_domain(orm)

    def get_for_owner(self, category_id: int, owner_id: int) -> Category | None:
        orm = CategoryORM.objects.filter(pk=category_id, owner_id=owner_id).first()
        return category_to_domain(orm) if orm is not None else None


class DjangoNoteRepository(NoteRepository):
    def add(self, note: Note) -> Note:
        fields: dict[str, object] = {
            "title": note.title,
            "content": note.content,
            "category_id": note.category_id,
            "owner_id": note.owner_id,
            "last_edited_at": note.last_edited_at,
        }
        if note.id is not None:
            fields["id"] = note.id
        orm = NoteORM.objects.create(**fields)
        return note_to_domain(orm)

    def get(self, note_id: UUID, owner_id: int) -> Note:
        try:
            orm = NoteORM.objects.get(pk=note_id, owner_id=owner_id)
        except NoteORM.DoesNotExist as exc:
            raise NoteNotFound(str(note_id)) from exc
        return note_to_domain(orm)

    def get_for_update(self, note_id: UUID, owner_id: int) -> Note:
        try:
            orm = NoteORM.objects.select_for_update().get(pk=note_id, owner_id=owner_id)
        except NoteORM.DoesNotExist as exc:
            raise NoteNotFound(str(note_id)) from exc
        return note_to_domain(orm)

    def save(self, note: Note) -> Note:
        assert note.id is not None  # a persisted note always has an id
        assert note.last_edited_at is not None  # set by the service before save
        orm = NoteORM.objects.get(pk=note.id)
        orm.title = note.title
        orm.content = note.content
        orm.category_id = note.category_id
        orm.last_edited_at = note.last_edited_at
        orm.save(update_fields=["title", "content", "category", "last_edited_at"])
        return note_to_domain(orm)

    def list_for_owner(
        self, owner_id: int, category_id: int | None = None
    ) -> list[Note]:
        qs = NoteORM.objects.filter(owner_id=owner_id)
        if category_id is not None:
            qs = qs.filter(category_id=category_id)
        return [note_to_domain(orm) for orm in qs]

    def delete(self, note_id: UUID, owner_id: int) -> None:
        deleted, _ = NoteORM.objects.filter(pk=note_id, owner_id=owner_id).delete()
        if deleted == 0:
            raise NoteNotFound(str(note_id))

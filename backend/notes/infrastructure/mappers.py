"""Map ORM rows to/from domain entities."""

from ..domain.entities import Category, Note
from .models import CategoryORM, NoteORM


def category_to_domain(orm: CategoryORM) -> Category:
    return Category(
        id=orm.pk,
        name=orm.name,
        color=orm.color,
        owner_id=orm.owner_id,
        is_default=orm.is_default,
    )


def note_to_domain(orm: NoteORM) -> Note:
    return Note(
        id=orm.pk,
        title=orm.title,
        content=orm.content,
        category_id=orm.category_id,
        owner_id=orm.owner_id,
        created_at=orm.created_at,
        last_edited_at=orm.last_edited_at,
        version=orm.version,
        locked_by=orm.locked_by_session,
        lock_expires_at=orm.lock_expires_at,
    )

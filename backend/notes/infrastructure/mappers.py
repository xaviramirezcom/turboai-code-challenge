"""Map ORM rows to/from domain entities."""

from ..domain.entities import Category
from .models import CategoryORM


def category_to_domain(orm: CategoryORM) -> Category:
    return Category(
        id=orm.pk,
        name=orm.name,
        color=orm.color,
        owner_id=orm.owner_id,
        is_default=orm.is_default,
    )

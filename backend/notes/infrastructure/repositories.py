"""Django adapters implementing the notes repository ports.

Repositories return domain entities, never ORM objects.
"""

from ..domain.entities import Category
from ..domain.repositories import CategoryRepository
from .mappers import category_to_domain
from .models import CategoryORM


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

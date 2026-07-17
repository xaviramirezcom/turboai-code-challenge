"""DefaultCategorySeeder adapter — seeds a new user's 3 categories (1.5).

Cross-context wiring lives at the infrastructure edge: it uses the notes
context's canonical default set and its repository. The accounts application
layer never imports notes — it depends only on the seeder port.
"""

from notes.domain.defaults import DEFAULT_CATEGORIES
from notes.domain.entities import Category
from notes.infrastructure.repositories import DjangoCategoryRepository


class NotesCategorySeeder:
    def seed_defaults(self, owner_id: int) -> None:
        repo = DjangoCategoryRepository()
        for default in DEFAULT_CATEGORIES:
            repo.add(
                Category(
                    id=None,
                    name=default.name,
                    color=default.color,
                    owner_id=owner_id,
                    is_default=True,
                )
            )

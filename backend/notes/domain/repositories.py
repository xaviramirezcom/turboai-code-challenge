"""Repository ports (abstract) for the notes context."""

from abc import ABC, abstractmethod

from .entities import Category


class CategoryRepository(ABC):
    @abstractmethod
    def add(self, category: Category) -> Category: ...

    @abstractmethod
    def list_for_owner(self, owner_id: int) -> list[Category]: ...

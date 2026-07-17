"""Domain entities for the notes context. Pure Python — no framework imports."""

import re
from dataclasses import dataclass

from .exceptions import InvalidCategory

_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


@dataclass
class Category:
    """A note category. Its colour tints the board card and editor background."""

    id: int | None
    name: str
    color: str
    owner_id: int
    is_default: bool = False

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise InvalidCategory("category name must not be empty")
        self.name = self.name.strip()
        if not _HEX_COLOR.match(self.color):
            raise InvalidCategory(f"colour must be a #RRGGBB hex, got {self.color!r}")

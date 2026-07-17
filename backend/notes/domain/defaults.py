"""Canonical default categories seeded for every new user.

Source of truth for the three categories the demo shows (auth criterion 1.5,
board criterion 1.3). Colours from ``specs/notes/design.md``.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DefaultCategory:
    name: str
    color: str


DEFAULT_CATEGORIES: tuple[DefaultCategory, ...] = (
    DefaultCategory(name="Random Thoughts", color="#E7A67E"),
    DefaultCategory(name="School", color="#F3DCA0"),
    DefaultCategory(name="Personal", color="#8FB8AC"),
)

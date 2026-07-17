"""Canonical default categories seeded for every new user.

Source of truth for the three categories the demo shows (auth criterion 1.5,
board criterion 1.3). Colours are the EXACT Figma card/editor hex (the border /
solid colour; the card & editor background render it at 50% alpha) — confirmed
against frames 2:39 (Random Thoughts), 2:130 (School), 2:118 (Personal).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DefaultCategory:
    name: str
    color: str


DEFAULT_CATEGORIES: tuple[DefaultCategory, ...] = (
    DefaultCategory(name="Random Thoughts", color="#EF9C66"),
    DefaultCategory(name="School", color="#FCDC94"),
    DefaultCategory(name="Personal", color="#78ABA8"),
)

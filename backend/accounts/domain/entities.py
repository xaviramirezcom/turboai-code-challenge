"""Accounts domain entities. Framework-free.

Auth reuses Django's ``User`` for persistence, so the domain only needs a small
value object to carry identity across the port boundary (never an ORM object).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class UserAccount:
    id: int
    email: str

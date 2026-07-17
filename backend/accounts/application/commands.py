"""Command DTOs crossing the application boundary (no DRF serializers inward)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Register:
    email: str
    password: str


@dataclass(frozen=True)
class Login:
    email: str
    password: str

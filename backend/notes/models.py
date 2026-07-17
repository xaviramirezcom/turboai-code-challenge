"""Django model discovery shim.

ORM models live in ``notes.infrastructure.models`` (persistence is an adapter
concern). Django loads models from ``<app>.models``, so re-export them here.
This module is outside the enforced inward layers, so importing infrastructure
here is allowed.
"""

from notes.infrastructure.models import CategoryORM, NoteORM

__all__ = ["CategoryORM", "NoteORM"]

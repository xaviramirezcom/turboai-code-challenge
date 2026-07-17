"""Composition root — wires concrete adapters to ports for the notes context."""

from .application.services import CategoryService, NoteService
from .infrastructure.clock import DjangoClock
from .infrastructure.events import LoggingEventPublisher
from .infrastructure.repositories import (
    DjangoCategoryRepository,
    DjangoNoteRepository,
)
from .infrastructure.unit_of_work import DjangoUnitOfWork


def note_service() -> NoteService:
    return NoteService(
        notes=DjangoNoteRepository(),
        categories=DjangoCategoryRepository(),
        uow=DjangoUnitOfWork(),
        events=LoggingEventPublisher(),
        clock=DjangoClock(),
    )


def category_service() -> CategoryService:
    return CategoryService(categories=DjangoCategoryRepository())

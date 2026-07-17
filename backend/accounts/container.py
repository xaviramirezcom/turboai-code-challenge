"""Composition root — the only place that wires concrete adapters to ports."""

from .application.services import AuthService
from .infrastructure.events import LoggingEventPublisher
from .infrastructure.passwords import DjangoPasswordPolicy
from .infrastructure.repositories import DjangoUserRepository
from .infrastructure.seeding import NotesCategorySeeder
from .infrastructure.tokens import DrfTokenIssuer
from .infrastructure.unit_of_work import DjangoUnitOfWork


def auth_service() -> AuthService:
    return AuthService(
        users=DjangoUserRepository(),
        tokens=DrfTokenIssuer(),
        seeder=NotesCategorySeeder(),
        password_policy=DjangoPasswordPolicy(),
        uow=DjangoUnitOfWork(),
        events=LoggingEventPublisher(),
    )

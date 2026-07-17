# Backend architecture — DDD / hexagonal (ports & adapters)

The backend is a **service-oriented modular monolith** built with strict
Domain-Driven Design and a hexagonal (ports & adapters) layering. Business rules
live in the code, in a framework-free domain; Django and DRF are adapters at the
edges. This document is the reference the LLM implements against — it also
doubles as the "key design decisions" section for the challenge README.

## The one rule: dependencies point inward

```
        ┌──────────────────── interface (DRF views, serializers, urls) ───────────────────┐
        │   ┌──────────────── application (use cases, commands, ports) ────────────────┐   │
        │   │   ┌──────────── domain (entities, value objects, rules) ────────────┐    │   │
        │   │   │                    imports NOTHING framework                    │    │   │
        │   │   └──────────────────────────────────────────────────────────────┘    │   │
        │   │            depends only on domain + port interfaces                    │   │
        │   └──────────────────────────────────────────────────────────────────────┘   │
        │   infrastructure (ORM models, repositories, UoW, event adapter) implements    │
        │   the ports and depends inward — never the reverse                            │
        └───────────────────────────────────────────────────────────────────────────────┘
```

- **domain** imports nothing from Django/DRF/infrastructure. Pure Python.
- **application** imports domain and **port interfaces** only.
- **infrastructure** and **interface** are the outer adapters; they depend
  inward. Nothing inner imports them.
- This is **enforced by `import-linter`** (`backend/.importlinter`), run in
  `/verify`, CI, and the pre-commit hook — a violation fails the build.

## Folder layout (per bounded context)

```
backend/
├── config/                     # Django project: settings/, urls, asgi/wsgi
├── notes/                      # bounded context
│   ├── domain/
│   │   ├── entities.py         # Note entity + invariants (no Django)
│   │   ├── value_objects.py    # e.g. Title
│   │   ├── exceptions.py       # DomainError, EmptyTitle, NoteNotFound
│   │   └── repositories.py     # NoteRepository PORT (abstract)
│   ├── application/
│   │   ├── commands.py         # CreateNote, UpdateNote (DTOs)
│   │   ├── ports.py            # UnitOfWork, EventPublisher (protocols)
│   │   └── services.py         # use cases; orchestrate + transaction boundary
│   ├── infrastructure/
│   │   ├── models.py           # NoteORM (Django model) — persistence only
│   │   ├── mappers.py          # ORM <-> domain entity
│   │   ├── repositories.py     # DjangoNoteRepository implements the port
│   │   ├── unit_of_work.py     # DjangoUnitOfWork (transaction.atomic)
│   │   └── events.py           # LoggingEventPublisher (adapter → observability)
│   ├── interface/
│   │   ├── serializers.py      # DRF serializers (JSON <-> command/response)
│   │   ├── views.py            # DRF viewset → calls a use case
│   │   └── urls.py
│   ├── container.py            # composition root: wires adapters to ports
│   └── apps.py
├── observability/              # cross-cutting SUPPORT module (flat) — see specs/observability
└── shared/                     # shared kernel: base Entity, Result, DomainEvent
```

`notes` is a full bounded context with the four layers. `observability` is a
cross-cutting **support module** (logging is infrastructure by nature) — it stays
flat (`models.py`, `middleware.py`, `events.py`, `handlers.py`, `management/`)
rather than being forced into four layers. `shared` is the tiny common kernel.
Add a context, not a folder of loose files.

## A vertical slice, layer by layer (create + update a note)

### domain — the rules, no framework

```python
# notes/domain/exceptions.py
class DomainError(Exception): ...
class EmptyTitle(DomainError): ...
class NoteNotFound(DomainError): ...

# notes/domain/entities.py
from dataclasses import dataclass
from datetime import datetime
from .exceptions import EmptyTitle

@dataclass
class Note:
    id: int | None
    title: str
    body: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def __post_init__(self) -> None:
        self.rename(self.title)                 # invariant enforced on construction

    def rename(self, title: str) -> None:
        if not title or not title.strip():
            raise EmptyTitle("title must not be empty")
        self.title = title.strip()

# notes/domain/repositories.py  (the PORT)
from abc import ABC, abstractmethod
from .entities import Note

class NoteRepository(ABC):
    @abstractmethod
    def add(self, note: Note) -> Note: ...
    @abstractmethod
    def get_for_update(self, note_id: int) -> Note: ...   # raises NoteNotFound
    @abstractmethod
    def list(self) -> list[Note]: ...
    @abstractmethod
    def save(self, note: Note) -> Note: ...
    @abstractmethod
    def delete(self, note_id: int) -> None: ...
```

### application — use cases + the transaction boundary

```python
# notes/application/ports.py
from typing import Protocol
from ..domain.repositories import NoteRepository

class UnitOfWork(Protocol):
    notes: NoteRepository
    def __enter__(self) -> "UnitOfWork": ...
    def __exit__(self, *exc: object) -> None: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...

class EventPublisher(Protocol):
    def publish(self, name: str, **metadata: object) -> None: ...

# notes/application/commands.py
from dataclasses import dataclass
@dataclass(frozen=True)
class CreateNote: title: str; body: str; actor: str | None = None
@dataclass(frozen=True)
class UpdateNote: id: int; title: str; body: str; actor: str | None = None

# notes/application/services.py
from ..domain.entities import Note
from .commands import CreateNote, UpdateNote
from .ports import UnitOfWork, EventPublisher

class NoteService:
    def __init__(self, uow: UnitOfWork, events: EventPublisher) -> None:
        self._uow, self._events = uow, events

    def create(self, cmd: CreateNote) -> Note:
        with self._uow as uow:
            note = uow.notes.add(Note(id=None, title=cmd.title, body=cmd.body))
            uow.commit()
        self._events.publish("note.created", actor=cmd.actor,
                             entity_type="Note", entity_id=note.id)
        return note

    def update(self, cmd: UpdateNote) -> Note:
        with self._uow as uow:
            note = uow.notes.get_for_update(cmd.id)   # row-locked by the adapter
            note.rename(cmd.title)
            note.body = cmd.body
            note = uow.notes.save(note)
            uow.commit()
        self._events.publish("note.updated", actor=cmd.actor,
                             entity_type="Note", entity_id=note.id)
        return note
```

Note the application layer has **zero Django imports** — it talks to `UnitOfWork`
and `EventPublisher` interfaces. That's what makes it unit-testable with fakes.

### infrastructure — the adapters (this is where `transaction.atomic()` + `select_for_update()` live)

```python
# notes/infrastructure/models.py
from django.db import models
class NoteORM(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = "notes"
        ordering = ["-updated_at"]

# notes/infrastructure/repositories.py
from django.db import transaction
from ..domain.entities import Note
from ..domain.exceptions import NoteNotFound
from ..domain.repositories import NoteRepository
from .models import NoteORM
from .mappers import to_domain, apply_to_orm

class DjangoNoteRepository(NoteRepository):
    def add(self, note: Note) -> Note:
        orm = NoteORM.objects.create(title=note.title, body=note.body)
        return to_domain(orm)

    def get_for_update(self, note_id: int) -> Note:
        try:
            orm = NoteORM.objects.select_for_update().get(pk=note_id)  # locks the row
        except NoteORM.DoesNotExist as exc:
            raise NoteNotFound(str(note_id)) from exc
        return to_domain(orm)

    def save(self, note: Note) -> Note:
        orm = NoteORM.objects.get(pk=note.id)
        apply_to_orm(note, orm)
        orm.save(update_fields=["title", "body", "updated_at"])
        return to_domain(orm)
    # list(), delete() analogous

# notes/infrastructure/unit_of_work.py
from django.db import transaction
from .repositories import DjangoNoteRepository

class DjangoUnitOfWork:
    def __enter__(self) -> "DjangoUnitOfWork":
        self._atomic = transaction.atomic(); self._atomic.__enter__()  # begins the tx
        self.notes = DjangoNoteRepository()
        return self
    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type: transaction.set_rollback(True)
        self._atomic.__exit__(exc_type, exc, tb)                        # commits on clean exit
    def commit(self) -> None: ...        # committed by the atomic block on clean exit
    def rollback(self) -> None: transaction.set_rollback(True)
```

This is the answer to your earlier question, in place: the stored-procedure
transaction boundary becomes `DjangoUnitOfWork` wrapping `transaction.atomic()`,
and the race-safe claim becomes `select_for_update()` in the repository adapter.
The invariant logic is all in Python, testable, greppable — no PL/pgSQL.

### interface — the HTTP adapter (thin)

```python
# notes/interface/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from ..container import note_service
from ..application.commands import CreateNote
from ..domain.exceptions import DomainError
from .serializers import NoteInSerializer, NoteOutSerializer

class NoteViewSet(viewsets.ViewSet):
    def create(self, request):
        data = NoteInSerializer(data=request.data); data.is_valid(raise_exception=True)
        try:
            note = note_service().create(CreateNote(**data.validated_data))
        except DomainError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(NoteOutSerializer(note).data, status=status.HTTP_201_CREATED)
```

### composition root — wire adapters to ports (the only place that imports adapters)

```python
# notes/container.py
from .application.services import NoteService
from .infrastructure.unit_of_work import DjangoUnitOfWork
from .infrastructure.events import LoggingEventPublisher

def note_service() -> NoteService:
    return NoteService(uow=DjangoUnitOfWork(), events=LoggingEventPublisher())
```

## How observability binds in (ports again)

The application layer publishes domain events through the `EventPublisher`
**port**. The infrastructure `LoggingEventPublisher` adapter implements it by
calling the observability module's `log_event(...)` (which writes `EventLog`).
So the notes application never imports the logging code — it depends on the
interface, and the adapter is swapped in at the composition root. Requests and
errors are logged by the observability middleware (an interface/infra concern),
independent of the domain.

## Testing per layer (this is a big coverage win)

| Layer | Test style | Needs a DB? |
|---|---|---|
| domain | pure unit — `Note("")` raises `EmptyTitle` | no |
| application | use case with **in-memory fakes** (`FakeUnitOfWork`, `InMemoryNoteRepository`, `FakeEventPublisher`) | no — fast |
| infrastructure | integration — `DjangoNoteRepository` round-trips; `get_for_update` locks | yes |
| interface | API — `APIClient` POST 201 / 400 | yes |

The in-memory fakes make the use-case tests fast and exhaustive; the DB is only
touched where it's actually the thing under test. Criterion→test traceability
(from the spec) still applies at every layer.

## Enforcement (`backend/.importlinter`)

Two contracts, checked by `lint-imports`:
1. **layers** — `notes.interface` → `notes.application` → `notes.domain`
   (inner layers cannot import outer ones).
2. **forbidden** — `notes.domain` and `notes.application` may not import
   `django`, `rest_framework`, `notes.infrastructure`, or `notes.interface`.

If someone imports the ORM into the domain to "save time," the build goes red.
Replicate the layer + forbidden contracts for each new **four-layer bounded
context**. Flat support modules like `observability` instead get only an
independence contract (they must not import a bounded context), and `shared` gets
a generic-kernel contract — both already in `backend/.importlinter`.

## Pragmatism note

Strict separation (domain entities + ORM models + mappers) is more code than an
active-record Django app. That's the deliberate trade you chose — the payoff is a
domain you can test without a database, adapters you can swap, and a boundary a
tool enforces. Keep each context small; don't add layers a context doesn't need
(a value object with no rules is just a field — inline it).

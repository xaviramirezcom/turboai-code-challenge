"""Domain errors for the notes context (framework-free)."""


class DomainError(Exception):
    """Base class for notes domain rule violations."""


class InvalidCategory(DomainError):
    """A category was constructed with invalid data (name/colour)."""


class CategoryNotFound(DomainError):
    """No matching category for the owner (e.g. no default seeded)."""


class ForeignCategory(DomainError):
    """A note was pointed at a category the user does not own (criterion 3.2)."""


class NoteNotFound(DomainError):
    """No note with that id for the requesting owner."""


class NoteLocked(DomainError):
    """The note is held by another session's unexpired lock (5.2 → HTTP 423)."""

    def __init__(self, locked_by: str, lock_expires_at: object) -> None:
        self.locked_by = locked_by
        self.lock_expires_at = lock_expires_at
        super().__init__("note locked by another session")


class VersionConflict(DomainError):
    """A PATCH's base_version != the server version (6.2 → HTTP 409).

    Carries the current server note so the client can reconcile.
    """

    def __init__(self, current: object) -> None:
        self.current = current
        super().__init__("note version conflict")

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

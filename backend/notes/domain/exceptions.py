"""Domain errors for the notes context (framework-free)."""


class DomainError(Exception):
    """Base class for notes domain rule violations."""


class InvalidCategory(DomainError):
    """A category was constructed with invalid data (name/colour)."""

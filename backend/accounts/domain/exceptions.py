"""Domain errors for the accounts context (framework-free)."""


class AuthError(Exception):
    """Base class for authentication/registration rule violations."""


class EmailAlreadyRegistered(AuthError):
    """Signup used an email that already has an account (criterion 1.3)."""


class InvalidCredentials(AuthError):
    """Login credentials did not match (criterion 2.3)."""


class WeakPassword(AuthError):
    """Password failed policy (criterion 1.3). Carries field-level messages."""

    def __init__(self, messages: list[str]) -> None:
        self.messages = messages
        super().__init__("; ".join(messages))

"""Password policy adapter — wraps Django's configured validators.

Keeps the AuthService free of Django while enforcing the ≥8-char policy
(``AUTH_PASSWORD_VALIDATORS`` in settings).
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from ..domain.exceptions import WeakPassword


class DjangoPasswordPolicy:
    def validate(self, raw_password: str, *, email: str) -> None:
        try:
            validate_password(raw_password)
        except ValidationError as exc:
            raise WeakPassword(list(exc.messages)) from exc

"""Pytest configuration.

Use a fast password hasher for the whole test run. Many API tests register real
users (PBKDF2 is deliberately slow), so this cuts the suite's wall-clock a lot.
Production keeps the strong default hasher from ``config.settings``.
"""

from django.conf import settings


def pytest_configure() -> None:
    settings.PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]

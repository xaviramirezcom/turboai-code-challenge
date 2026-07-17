"""Test settings — in-memory SQLite so tests never touch the remote Supabase
Postgres (fast, isolated, and matches CI where DATABASE_URL is unset). Everything
else inherits from the real settings.
"""

from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Fast hasher — many API tests register real users (PBKDF2 is deliberately slow).
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

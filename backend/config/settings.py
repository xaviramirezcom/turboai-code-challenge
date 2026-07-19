"""Django settings for the Turbo AI notes backend.

Configuration is environment-driven (django-environ). Secrets live only in the
environment / a local ``.env`` — never in git. See ``.env.example``.
"""

from pathlib import Path

import environ
from corsheaders.defaults import default_headers

from config.db import tune_connection

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["*"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    ALLOW_NGROK_ORIGINS=(bool, False),
)

# Load a local .env if present (never committed). CI/prod inject real env vars.
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-key-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "observability",
    "notes",
]

# RequestLogMiddleware sits outermost so it wraps (and logs) everything.
# CorsMiddleware must precede CommonMiddleware to answer preflight (OPTIONS) and
# add CORS headers. Auth is DRF TokenAuthentication (per-view), so Django's
# session-based AuthenticationMiddleware is intentionally not installed.
MIDDLEWARE = [
    "observability.middleware.RequestLogMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

# Cross-origin: the Next.js dev server (http://localhost:3000) calls this API.
# Token auth uses the Authorization header (not cookies), so credentials stay off.
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

# Always accept loopback origins on any port, regardless of the env allowlist, so
# the app works whether it's opened at localhost:3000 OR 127.0.0.1:3000 (the
# browser treats those as different origins). Loopback is the same machine, so
# this is safe; real deployments are still gated by CORS_ALLOWED_ORIGINS above.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

# ngrok (see ngrok.yml) gives the dev stack public HTTPS URLs for demos. The free
# plan assigns a NEW random subdomain on every restart, so pinning one in
# CORS_ALLOWED_ORIGINS would break on the next `ngrok start` — hence a pattern.
#
# This trusts every tunnel on a shared public domain, so it is opt-in and OFF by
# default. It is deliberately NOT tied to DEBUG: a tunnelled backend is publicly
# reachable, and DEBUG=True would serve Django's traceback pages (settings, env,
# local variables) to anyone who finds the URL. Demoing must not require that.
#
#     ALLOW_NGROK_ORIGINS=1 python manage.py runserver
#
# A real deployment lists its exact origin in CORS_ALLOWED_ORIGINS and leaves
# this off; a reserved (paid) ngrok domain belongs in that env var too.
NGROK_ORIGIN_REGEXES = [
    r"^https://[a-z0-9][a-z0-9-]*\.ngrok(-free)?\.(app|dev)$",
    r"^https://[a-z0-9][a-z0-9-]*\.ngrok\.io$",
]

ALLOW_NGROK_ORIGINS = env("ALLOW_NGROK_ORIGINS")

if ALLOW_NGROK_ORIGINS:
    CORS_ALLOWED_ORIGIN_REGEXES += NGROK_ORIGIN_REGEXES

# The advisory-lock endpoints send an X-Session-Id header; it must be allowed in
# the CORS preflight or the browser cancels the lock/heartbeat/unlock requests.
# ngrok-skip-browser-warning suppresses the free plan's HTML interstitial. The
# client sends it on every request, and a custom header makes even a GET
# non-simple — so without it here the browser fails the preflight and the API
# reads as unreachable (see shared/api/ngrokHeader.ts).
CORS_ALLOW_HEADERS = (*default_headers, "x-session-id", "ngrok-skip-browser-warning")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# Supabase Postgres in prod via DATABASE_URL; SQLite locally / in CI tests.
# Escape hatch: set USE_SQLITE=1 to force a local SQLite file even when
# DATABASE_URL points at Supabase — lets the app run when the remote DB is
# paused/unreachable (empty local DB; re-signup). Unset it to go back to Supabase.
_sqlite_default = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
DATABASES = {
    "default": env.db("DATABASE_URL", default=_sqlite_default)
    if not env.bool("USE_SQLITE", default=False)
    else env.db_url_config(_sqlite_default),
}
# Connection handling depends on which Supabase pooler port DATABASE_URL uses:
# 6543 (transaction mode) pools server-side, so Django must not hold connections
# and must disable psycopg's prepared statements; 5432 (session mode) pins one
# slot per client, so connections are persisted but each one squats a slot of
# the 15 available. Prefer 6543 for a threaded app. See config/db.py.
DATABASES["default"] = tune_connection(
    DATABASES["default"],
    session_conn_max_age=env.int("DB_CONN_MAX_AGE", default=600),
)

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Logging — app ERRORs are persisted as ErrorLog rows via the DB handler.
# The DB handler is disabled during tests except where a test opts in.
# ---------------------------------------------------------------------------
LOG_TO_DB = env.bool("LOG_TO_DB", default=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "%(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "db": {
            "class": "observability.handlers.DBLogHandler",
            "level": "ERROR",
        },
    },
    "root": {
        "handlers": ["console"] + (["db"] if LOG_TO_DB else []),
        "level": "INFO",
    },
}

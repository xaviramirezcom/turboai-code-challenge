"""CORS preflight is answered for the configured frontend origin.

The Next.js dev server (http://localhost:3000) calls this API cross-origin, so
the signup/login preflight (OPTIONS) must return Access-Control-Allow-Origin.
"""

import os
import subprocess
import sys

import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def _preflight(origin: str):
    return APIClient().options(
        "/api/auth/login/",
        HTTP_ORIGIN=origin,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
    )


def test_preflight_allows_the_configured_frontend_origin() -> None:
    resp = _preflight("http://localhost:3000")
    assert resp["Access-Control-Allow-Origin"] == "http://localhost:3000"


@pytest.mark.parametrize(
    "origin",
    ["http://127.0.0.1:3000", "http://localhost:5173"],
)
def test_preflight_allows_any_loopback_origin(origin: str) -> None:
    # The browser treats localhost and 127.0.0.1 as different origins; both are
    # the same machine, so either must work (otherwise the app reads as offline).
    resp = _preflight(origin)
    assert resp["Access-Control-Allow-Origin"] == origin


def test_preflight_allows_the_x_session_id_header() -> None:
    # The advisory-lock endpoints send X-Session-Id; without it in the preflight
    # allow-list the browser cancels lock/heartbeat/unlock (locking silently
    # breaks — both tabs edit and collide on 409).
    resp = APIClient().options(
        "/api/notes/00000000-0000-0000-0000-000000000000/lock/",
        HTTP_ORIGIN="http://localhost:3000",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-session-id",
    )
    assert "x-session-id" in resp["Access-Control-Allow-Headers"].lower()


def test_preflight_allows_the_ngrok_skip_browser_warning_header() -> None:
    # The client sends this on every request to suppress ngrok's HTML
    # interstitial. A custom header makes even a GET non-simple, so if the
    # preflight rejects it the browser blocks the call and the API reads as down.
    resp = APIClient().options(
        "/api/health/",
        HTTP_ORIGIN="http://localhost:3000",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="ngrok-skip-browser-warning",
    )
    assert "ngrok-skip-browser-warning" in resp["Access-Control-Allow-Headers"].lower()


def test_preflight_does_not_allow_an_unlisted_origin() -> None:
    resp = _preflight("http://evil.example.com")
    assert not resp.has_header("Access-Control-Allow-Origin")


@pytest.mark.parametrize(
    "origin",
    [
        "https://a1b2-3-4-5-6.ngrok-free.app",
        "https://turbo-notes.ngrok.app",
        "https://turbo-notes.ngrok-free.dev",
        "https://legacy.ngrok.io",
    ],
)
def test_preflight_allows_an_ngrok_tunnel_origin_when_opted_in(origin: str) -> None:
    # The free plan hands out a new subdomain on every restart, so the pattern —
    # not a pinned host — is what keeps a demo working. Opt-in via
    # ALLOW_NGROK_ORIGINS=1 (settings.py).
    with override_settings(
        CORS_ALLOWED_ORIGIN_REGEXES=[
            *settings.CORS_ALLOWED_ORIGIN_REGEXES,
            *settings.NGROK_ORIGIN_REGEXES,
        ]
    ):
        resp = _preflight(origin)
    assert resp["Access-Control-Allow-Origin"] == origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://ngrok-free.app.evil.example.com",
        "https://evil.example.com/x.ngrok-free.app",
        "http://a1b2.ngrok-free.app",
    ],
)
def test_ngrok_pattern_does_not_allow_a_lookalike_origin(origin: str) -> None:
    # The pattern is anchored and https-only: a domain that merely CONTAINS
    # "ngrok-free.app" (or an http:// tunnel) must not slip through.
    with override_settings(
        CORS_ALLOWED_ORIGIN_REGEXES=[
            *settings.CORS_ALLOWED_ORIGIN_REGEXES,
            *settings.NGROK_ORIGIN_REGEXES,
        ]
    ):
        resp = _preflight(origin)
    assert not resp.has_header("Access-Control-Allow-Origin")


def test_ngrok_origins_are_not_allowed_by_default() -> None:
    # ALLOW_NGROK_ORIGINS is off unless explicitly set, so the tunnel pattern is
    # NOT active — this is what stops a deployment trusting every ngrok subdomain.
    assert not settings.ALLOW_NGROK_ORIGINS
    resp = _preflight("https://a1b2-3-4-5-6.ngrok-free.app")
    assert not resp.has_header("Access-Control-Allow-Origin")


@pytest.mark.parametrize(
    ("env_overrides", "expect_ngrok_allowed"),
    [
        ({"ALLOW_NGROK_ORIGINS": "1", "DEBUG": "0"}, True),
        ({"ALLOW_NGROK_ORIGINS": "0", "DEBUG": "1"}, False),
    ],
)
def test_only_the_opt_in_flag_enables_ngrok_origins(
    env_overrides: dict[str, str], expect_ngrok_allowed: bool
) -> None:
    """The flag — not DEBUG — is what turns the tunnel pattern on.

    Tunnelling must never require DEBUG=True: a tunnelled backend is publicly
    reachable, and DEBUG serves Django's traceback pages (settings, env, locals)
    to anyone who finds the URL. Loads settings in a subprocess because the
    regex list is built once at import time.
    """
    probe = (
        "import django; django.setup();"
        "from django.conf import settings as s;"
        "print(any(p in s.CORS_ALLOWED_ORIGIN_REGEXES for p in s.NGROK_ORIGIN_REGEXES))"
    )
    result = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=settings.BASE_DIR,
        env={
            **os.environ,
            "DJANGO_SETTINGS_MODULE": "config.settings",
            **env_overrides,
        },
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == str(expect_ngrok_allowed)


def test_preflight_does_not_allow_a_non_loopback_lan_origin() -> None:
    # Loopback is broadened for dev convenience, but arbitrary LAN/public origins
    # stay gated by CORS_ALLOWED_ORIGINS.
    resp = _preflight("http://192.168.1.50:3000")
    assert not resp.has_header("Access-Control-Allow-Origin")

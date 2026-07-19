"""CORS preflight is answered for the configured frontend origin.

The Next.js dev server (http://localhost:3000) calls this API cross-origin, so
the signup/login preflight (OPTIONS) must return Access-Control-Allow-Origin.
"""

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


def test_preflight_does_not_allow_a_non_loopback_lan_origin() -> None:
    # Loopback is broadened for dev convenience, but arbitrary LAN/public origins
    # stay gated by CORS_ALLOWED_ORIGINS.
    resp = _preflight("http://192.168.1.50:3000")
    assert not resp.has_header("Access-Control-Allow-Origin")


# A deployed origin is whatever CORS_ALLOWED_ORIGINS names at runtime (a tunnel
# in dev, a real domain in prod). Tests never encode a specific host — they pin
# the rule: exactly what the env lists is allowed, and nothing else.
DEPLOYED_ORIGIN = "https://notes.example.com"


def test_preflight_allows_an_origin_named_in_the_allowlist() -> None:
    with override_settings(CORS_ALLOWED_ORIGINS=[DEPLOYED_ORIGIN]):
        resp = _preflight(DEPLOYED_ORIGIN)
    assert resp["Access-Control-Allow-Origin"] == DEPLOYED_ORIGIN


@pytest.mark.parametrize(
    "origin",
    [
        "https://other.example.com",
        "https://notes.example.com.evil.test",
        "http://notes.example.com",
    ],
)
def test_preflight_rejects_origins_the_allowlist_does_not_name(origin: str) -> None:
    # Listing one origin must not admit its neighbours: a different host, a
    # lookalike suffix, and the same host over http all stay blocked.
    with override_settings(CORS_ALLOWED_ORIGINS=[DEPLOYED_ORIGIN]):
        resp = _preflight(origin)
    assert not resp.has_header("Access-Control-Allow-Origin")


def test_only_loopback_is_granted_without_configuration() -> None:
    # The shipped regexes cover local dev only; every public origin has to come
    # from CORS_ALLOWED_ORIGINS. Guards against a wildcard creeping back in.
    assert settings.CORS_ALLOWED_ORIGIN_REGEXES == [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
    ]
    resp = _preflight(DEPLOYED_ORIGIN)
    assert not resp.has_header("Access-Control-Allow-Origin")

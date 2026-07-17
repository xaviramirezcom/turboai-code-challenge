"""CORS preflight is answered for the configured frontend origin.

The Next.js dev server (http://localhost:3000) calls this API cross-origin, so
the signup/login preflight (OPTIONS) must return Access-Control-Allow-Origin.
"""

import pytest
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


def test_preflight_does_not_allow_an_unlisted_origin() -> None:
    resp = _preflight("http://evil.example.com")
    assert not resp.has_header("Access-Control-Allow-Origin")

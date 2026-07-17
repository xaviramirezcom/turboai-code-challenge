"""API-level tests via DRF APIClient — the full request path (URL → view → DB).

These exercise the real adapters (Django User, DRF Token, category seeding) and
the observability middleware that wraps every request.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from notes.infrastructure.models import CategoryORM
from observability.models import ErrorLog, EventLog, RequestLog

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    return APIClient()


# --- Sign up -------------------------------------------------------------


def test_signup_returns_201_with_token_and_seeds_three_categories(
    client: APIClient,
) -> None:
    # covers 1.1, 1.2, 1.5
    resp = client.post(
        "/api/auth/signup/",
        {"email": "new@friend.com", "password": "s3cure-pw!"},
        format="json",
    )

    assert resp.status_code == 201
    assert resp.data["token"]
    assert resp.data["user"]["email"] == "new@friend.com"

    user = get_user_model().objects.get(username="new@friend.com")
    cats = list(CategoryORM.objects.filter(owner=user).values_list("name", flat=True))
    assert cats == ["Random Thoughts", "School", "Personal"]
    assert CategoryORM.objects.filter(owner=user, is_default=True).count() == 3


def test_signup_rejects_duplicate_email_with_400(client: APIClient) -> None:
    # covers 1.3
    client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    resp = client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )

    assert resp.status_code == 400
    assert "email" in resp.data
    assert get_user_model().objects.filter(username="a@b.com").count() == 1


def test_signup_rejects_weak_password_with_field_error(client: APIClient) -> None:
    # covers 1.3
    resp = client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "short"},
        format="json",
    )

    assert resp.status_code == 400
    assert "password" in resp.data
    assert not get_user_model().objects.filter(username="a@b.com").exists()


def test_signup_rejects_invalid_email_with_field_error(client: APIClient) -> None:
    # covers 1.3
    resp = client.post(
        "/api/auth/signup/",
        {"email": "not-an-email", "password": "s3cure-pw!"},
        format="json",
    )

    assert resp.status_code == 400
    assert "email" in resp.data


# --- Log in --------------------------------------------------------------


def test_login_returns_200_and_token_for_correct_credentials(
    client: APIClient,
) -> None:
    # covers 2.1, 2.2
    client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    resp = client.post(
        "/api/auth/login/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["token"]
    assert resp.data["user"]["email"] == "a@b.com"


def test_login_returns_401_for_wrong_password(client: APIClient) -> None:
    # covers 2.3
    client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    resp = client.post(
        "/api/auth/login/",
        {"email": "a@b.com", "password": "wrong-password"},
        format="json",
    )

    assert resp.status_code == 401


def test_login_returns_401_for_unknown_user(client: APIClient) -> None:
    # covers 2.3
    resp = client.post(
        "/api/auth/login/",
        {"email": "ghost@b.com", "password": "whatever8"},
        format="json",
    )

    assert resp.status_code == 401


def test_login_returns_401_for_a_deactivated_account(client: APIClient) -> None:
    # covers 2.3 — a disabled account must not authenticate
    client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    user = get_user_model().objects.get(username="a@b.com")
    user.is_active = False
    user.save(update_fields=["is_active"])

    resp = client.post(
        "/api/auth/login/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    assert resp.status_code == 401


def test_signup_rejects_an_over_long_email_with_400(client: APIClient) -> None:
    # covers 1.3 — a >150-char email is a clean field error, not a 500
    long_email = ("a" * 200) + "@b.com"
    resp = client.post(
        "/api/auth/signup/",
        {"email": long_email, "password": "s3cure-pw!"},
        format="json",
    )

    assert resp.status_code == 400
    assert "email" in resp.data


# --- Logout --------------------------------------------------------------


def test_logout_invalidates_the_token(client: APIClient) -> None:
    # covers logout (resolved open question)
    signup = client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": "s3cure-pw!"},
        format="json",
    )
    token = signup.data["token"]
    client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    resp = client.post("/api/auth/logout/")
    assert resp.status_code == 204

    # The token no longer authenticates.
    again = client.post("/api/auth/logout/")
    assert again.status_code == 401


# --- Access control ------------------------------------------------------


def test_protected_endpoint_requires_authentication(client: APIClient) -> None:
    # covers 4.1 — logout requires auth; anonymous request is rejected
    resp = client.post("/api/auth/logout/")
    assert resp.status_code == 401


# --- Security: no secret leakage into the logs ---------------------------


def test_password_never_appears_in_any_log_row(client: APIClient) -> None:
    # covers design "Security" — no password/token in any log row
    secret = "leak-detector-9x!"
    client.post(
        "/api/auth/signup/",
        {"email": "a@b.com", "password": secret},
        format="json",
    )

    haystack = " ".join(
        [
            *[str(r.metadata) for r in RequestLog.objects.all()],
            *[str(e.metadata) + str(e.actor) for e in EventLog.objects.all()],
            *[str(x.message) + str(x.metadata) for x in ErrorLog.objects.all()],
        ]
    )
    assert secret not in haystack
    # And a request row WAS written (middleware ran).
    assert RequestLog.objects.filter(path="/api/auth/signup/").exists()

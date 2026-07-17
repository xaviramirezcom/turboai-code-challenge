"""Collaboration API: version (409), advisory session-lock (423), health, since."""

from uuid import uuid4

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

SESSION_A = {"HTTP_X_SESSION_ID": "session-a"}
SESSION_B = {"HTTP_X_SESSION_ID": "session-b"}


def register(client: APIClient, email: str) -> None:
    resp = client.post(
        "/api/auth/signup/",
        {"email": email, "password": "s3cure-pw!"},
        format="json",
    )
    assert resp.status_code == 201
    client.credentials(HTTP_AUTHORIZATION=f"Token {resp.data['token']}")


@pytest.fixture
def client() -> APIClient:
    c = APIClient()
    register(c, "owner@b.com")
    return c


def _create(client: APIClient) -> dict:
    return client.post("/api/notes/", {}, format="json").data


# --- Health -------------------------------------------------------------


def test_health_needs_no_auth_and_returns_ok() -> None:
    # covers 1.1
    resp = APIClient().get("/api/health/")
    assert resp.status_code == 200
    assert resp.data == {"ok": True}


# --- Optimistic version -------------------------------------------------


def test_create_note_starts_at_version_1(client: APIClient) -> None:
    # covers 6.1
    assert _create(client)["version"] == 1


def test_create_with_client_uuid_is_idempotent(client: APIClient) -> None:
    # covers 3.4 — replaying an offline-created note (same client UUID) is a no-op
    note_id = str(uuid4())
    first = client.post("/api/notes/", {"id": note_id}, format="json")
    second = client.post("/api/notes/", {"id": note_id}, format="json")

    assert first.data["id"] == note_id
    assert second.data["id"] == note_id
    assert len(client.get("/api/notes/").data) == 1  # not duplicated


def test_patch_with_matching_base_version_bumps(client: APIClient) -> None:
    # covers 6.1, 6.2
    note = _create(client)
    resp = client.patch(
        f"/api/notes/{note['id']}/",
        {"title": "hi", "base_version": 1},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["version"] == 2


def test_patch_with_stale_base_version_returns_409_with_current(
    client: APIClient,
) -> None:
    # covers 6.2
    note = _create(client)
    client.patch(
        f"/api/notes/{note['id']}/",
        {"title": "first", "base_version": 1},
        format="json",
    )
    resp = client.patch(
        f"/api/notes/{note['id']}/",
        {"title": "stale", "base_version": 1},
        format="json",
    )
    assert resp.status_code == 409
    assert resp.data["version"] == 2  # current server note
    assert resp.data["title"] == "first"


# --- Advisory session lock ----------------------------------------------


def test_lock_then_another_session_is_rejected_423(client: APIClient) -> None:
    # covers 5.1, 5.2
    note = _create(client)
    first = client.post(f"/api/notes/{note['id']}/lock/", **SESSION_A)
    assert first.status_code == 200
    assert first.data["locked_by"] == "session-a"

    second = client.post(f"/api/notes/{note['id']}/lock/", **SESSION_B)
    assert second.status_code == 423
    assert second.data["locked_by"] == "session-a"


def test_patch_from_a_non_holding_session_is_rejected_423(client: APIClient) -> None:
    # covers 5.2
    note = _create(client)
    client.post(f"/api/notes/{note['id']}/lock/", **SESSION_A)

    resp = client.patch(
        f"/api/notes/{note['id']}/",
        {"content": "sneaky"},
        format="json",
        **SESSION_B,
    )
    assert resp.status_code == 423


def test_unlock_frees_the_note_for_another_session(client: APIClient) -> None:
    # covers 5.4
    note = _create(client)
    client.post(f"/api/notes/{note['id']}/lock/", **SESSION_A)
    assert (
        client.post(f"/api/notes/{note['id']}/unlock/", **SESSION_A).status_code == 204
    )
    assert client.post(f"/api/notes/{note['id']}/lock/", **SESSION_B).status_code == 200


def test_heartbeat_extends_and_needs_the_session_header(client: APIClient) -> None:
    # covers 5.3
    note = _create(client)
    client.post(f"/api/notes/{note['id']}/lock/", **SESSION_A)
    assert (
        client.post(f"/api/notes/{note['id']}/lock/heartbeat/", **SESSION_A).status_code
        == 200
    )
    # missing header → 400
    assert client.post(f"/api/notes/{note['id']}/lock/").status_code == 400


# --- Delta pull ---------------------------------------------------------


def test_since_returns_only_notes_edited_after(client: APIClient) -> None:
    # covers 3.1
    first = _create(client)
    second = _create(client)

    resp = client.get(f"/api/notes/?since={first['last_edited_at']}")
    assert resp.status_code == 200
    ids = [n["id"] for n in resp.data]
    assert second["id"] in ids
    assert first["id"] not in ids

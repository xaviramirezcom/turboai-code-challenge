"""API-level tests via DRF APIClient — full path URL → view → service → DB.

Users are created through the real signup endpoint so their 3 default categories
are seeded (auth 1.5), matching production.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def register(client: APIClient, email: str) -> str:
    resp = client.post(
        "/api/auth/signup/",
        {"email": email, "password": "s3cure-pw!"},
        format="json",
    )
    assert resp.status_code == 201
    return resp.data["token"]


@pytest.fixture
def client() -> APIClient:
    c = APIClient()
    token = register(c, "owner@b.com")
    c.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    return c


def _create(client: APIClient) -> dict:
    resp = client.post("/api/notes/", {}, format="json")
    assert resp.status_code == 201
    return resp.data


# --- Create -------------------------------------------------------------


def test_create_returns_201_empty_note_with_default_category(client: APIClient) -> None:
    # covers 1.1, 1.2
    resp = client.post("/api/notes/", {}, format="json")

    assert resp.status_code == 201
    assert resp.data["title"] == ""
    assert resp.data["content"] == ""
    assert resp.data["category"]["name"] == "Random Thoughts"  # first default
    assert resp.data["created_at"]
    assert resp.data["last_edited_at"]
    assert resp.data["id"]


def test_create_with_a_foreign_category_is_rejected(client: APIClient) -> None:
    # covers 3.2 (ownership)
    other = APIClient()
    other_token = register(other, "other@b.com")
    other.credentials(HTTP_AUTHORIZATION=f"Token {other_token}")
    foreign_cat = other.get("/api/categories/").data[0]["id"]

    resp = client.post("/api/notes/", {"category_id": foreign_cat}, format="json")
    assert resp.status_code == 400
    assert "category_id" in resp.data


# --- Edit / autosave ----------------------------------------------------


def test_patch_updates_content_and_returns_latest(client: APIClient) -> None:
    # covers 2.1, 2.2
    note = _create(client)

    resp = client.patch(
        f"/api/notes/{note['id']}/",
        {"title": "My Note", "content": "hello"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["title"] == "My Note"
    assert resp.data["content"] == "hello"
    assert resp.data["last_edited_at"] >= note["last_edited_at"]


def test_patch_change_category_recolours_and_persists(client: APIClient) -> None:
    # covers 3.2, 3.3 (colour comes from the category returned)
    note = _create(client)
    cats = client.get("/api/categories/").data
    school = next(c for c in cats if c["name"] == "School")

    resp = client.patch(
        f"/api/notes/{note['id']}/",
        {"category_id": school["id"]},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["category"]["name"] == "School"
    assert resp.data["category"]["color"] == school["color"]


def test_patch_foreign_category_returns_400(client: APIClient) -> None:
    # covers 3.2
    note = _create(client)
    other = APIClient()
    other.credentials(HTTP_AUTHORIZATION=f"Token {register(other, 'x@b.com')}")
    foreign = other.get("/api/categories/").data[0]["id"]

    resp = client.patch(
        f"/api/notes/{note['id']}/", {"category_id": foreign}, format="json"
    )
    assert resp.status_code == 400


# --- Retrieve / list / close -------------------------------------------


def test_retrieve_returns_persisted_latest_state(client: APIClient) -> None:
    # covers 4.1 — close returns to a board where the note's latest state is saved
    note = _create(client)
    client.patch(f"/api/notes/{note['id']}/", {"content": "saved"}, format="json")

    resp = client.get(f"/api/notes/{note['id']}/")
    assert resp.status_code == 200
    assert resp.data["content"] == "saved"


def test_list_and_filter_by_category(client: APIClient) -> None:
    # covers list + ?category filter
    cats = client.get("/api/categories/").data
    random_id = next(c["id"] for c in cats if c["name"] == "Random Thoughts")
    school_id = next(c["id"] for c in cats if c["name"] == "School")
    _create(client)  # default (Random Thoughts)
    client.post("/api/notes/", {"category_id": school_id}, format="json")

    all_notes = client.get("/api/notes/").data
    assert len(all_notes) == 2

    only_school = client.get(f"/api/notes/?category={school_id}").data
    assert len(only_school) == 1
    assert only_school[0]["category_id"] == school_id

    only_random = client.get(f"/api/notes/?category={random_id}").data
    assert len(only_random) == 1


# --- Delete -------------------------------------------------------------


def test_delete_returns_204_and_note_is_gone(client: APIClient) -> None:
    # covers delete (resolved open question)
    note = _create(client)
    assert client.delete(f"/api/notes/{note['id']}/").status_code == 204
    assert client.get(f"/api/notes/{note['id']}/").status_code == 404


# --- Access control -----------------------------------------------------


def test_another_user_cannot_read_or_edit_a_note(client: APIClient) -> None:
    # covers 5.2 owner-scoping
    note = _create(client)
    intruder = APIClient()
    intruder.credentials(HTTP_AUTHORIZATION=f"Token {register(intruder, 'evil@b.com')}")

    assert intruder.get(f"/api/notes/{note['id']}/").status_code == 404
    assert (
        intruder.patch(
            f"/api/notes/{note['id']}/", {"title": "hax"}, format="json"
        ).status_code
        == 404
    )
    assert intruder.delete(f"/api/notes/{note['id']}/").status_code == 404


def test_notes_and_categories_require_authentication() -> None:
    # covers 5.1 (API auth)
    anon = APIClient()
    assert anon.get("/api/notes/").status_code == 401
    assert anon.post("/api/notes/", {}, format="json").status_code == 401
    assert anon.get("/api/categories/").status_code == 401


def test_categories_endpoint_lists_the_three_seeded_categories(
    client: APIClient,
) -> None:
    # covers 3.1 (editor dropdown data)
    resp = client.get("/api/categories/")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.data]
    assert names == ["Random Thoughts", "School", "Personal"]
    assert all("color" in c for c in resp.data)

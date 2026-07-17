"""Board API behaviour: category note counts, filtering, ordering, isolation."""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


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


def _cats(client: APIClient) -> dict[str, dict]:
    return {c["name"]: c for c in client.get("/api/categories/").data}


def test_categories_endpoint_returns_per_category_note_counts(
    client: APIClient,
) -> None:
    # covers 1.1, 1.2
    school = _cats(client)["School"]
    client.post("/api/notes/", {}, format="json")  # default → Random Thoughts
    client.post("/api/notes/", {}, format="json")  # default → Random Thoughts
    client.post("/api/notes/", {"category_id": school["id"]}, format="json")

    cats = _cats(client)
    assert cats["Random Thoughts"]["note_count"] == 2
    assert cats["School"]["note_count"] == 1
    assert cats["Personal"]["note_count"] == 0
    # 1.1 — every category is present with a colour
    assert {"Random Thoughts", "School", "Personal"} <= set(cats)
    assert all("color" in c for c in cats.values())


def test_counts_are_owner_scoped(client: APIClient) -> None:
    # covers 1.2 / 5.2 — another user's notes never inflate my counts
    client.post("/api/notes/", {}, format="json")

    other = APIClient()
    register(other, "other@b.com")
    other.post("/api/notes/", {}, format="json")
    other.post("/api/notes/", {}, format="json")

    assert _cats(client)["Random Thoughts"]["note_count"] == 1
    assert _cats(other)["Random Thoughts"]["note_count"] == 2


def test_notes_are_ordered_by_most_recently_edited(client: APIClient) -> None:
    # covers 3.5
    first = client.post("/api/notes/", {}, format="json").data
    second = client.post("/api/notes/", {}, format="json").data
    # Edit the first so it becomes the most recently edited.
    client.patch(f"/api/notes/{first['id']}/", {"title": "bumped"}, format="json")

    ids = [n["id"] for n in client.get("/api/notes/").data]
    assert ids == [first["id"], second["id"]]


def test_filter_by_category_and_all(client: APIClient) -> None:
    # covers 2.1, 2.2
    school = _cats(client)["School"]
    client.post("/api/notes/", {}, format="json")  # Random Thoughts
    client.post("/api/notes/", {"category_id": school["id"]}, format="json")

    all_notes = client.get("/api/notes/").data
    assert len(all_notes) == 2  # 2.2

    school_only = client.get(f"/api/notes/?category={school['id']}").data
    assert len(school_only) == 1  # 2.1
    assert school_only[0]["category"]["name"] == "School"

"""log_event writes an EventLog row stamped with the current request_id."""

import pytest

from observability.context import new_request_id, reset_request_id
from observability.events import log_event
from observability.models import EventLog


@pytest.mark.django_db
def test_log_event_stamps_current_request_id() -> None:
    rid = new_request_id()
    log_event("user.registered", actor="a@b.com", entity_type="User", entity_id=7)

    row = EventLog.objects.get(action="user.registered")
    assert str(row.request_id) == rid
    assert row.actor == "a@b.com"
    assert row.entity_type == "User"
    assert row.entity_id == "7"
    reset_request_id()


@pytest.mark.django_db
def test_log_event_without_request_context_is_null() -> None:
    reset_request_id()
    log_event("user.logged_in", actor="a@b.com")
    assert EventLog.objects.get(action="user.logged_in").request_id is None

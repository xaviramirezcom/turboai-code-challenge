"""Redaction masks sensitive keys at any depth (auth security requirement)."""

from observability.redaction import redact


def test_masks_top_level_sensitive_keys() -> None:
    out = redact({"email": "a@b.com", "password": "hunter2", "token": "abc"})
    assert out == {"email": "a@b.com", "password": "***", "token": "***"}


def test_masks_case_insensitively_and_nested() -> None:
    out = redact({"outer": {"Password": "x", "Authorization": "Token y"}})
    assert out == {"outer": {"Password": "***", "Authorization": "***"}}


def test_masks_inside_lists() -> None:
    out = redact({"items": [{"api_key": "k"}, {"safe": "ok"}]})
    assert out == {"items": [{"api_key": "***"}, {"safe": "ok"}]}


def test_leaves_non_sensitive_values_untouched() -> None:
    assert redact({"count": 3, "name": "x"}) == {"count": 3, "name": "x"}

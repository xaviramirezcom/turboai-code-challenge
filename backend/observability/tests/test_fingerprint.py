"""Errors group by content, not by timestamp."""

from observability.fingerprint import fingerprint_exc


def _raise(exc: Exception) -> Exception:
    try:
        raise exc
    except Exception as caught:  # noqa: BLE001
        return caught


def test_identical_errors_share_a_fingerprint() -> None:
    a = fingerprint_exc(_raise(ValueError("boom")))
    b = fingerprint_exc(_raise(ValueError("boom")))
    assert a == b


def test_numbers_are_normalized_so_ids_dont_split_groups() -> None:
    a = fingerprint_exc(_raise(ValueError("note 123 missing")))
    b = fingerprint_exc(_raise(ValueError("note 456 missing")))
    assert a == b


def test_different_exception_types_separate() -> None:
    a = fingerprint_exc(_raise(ValueError("boom")))
    b = fingerprint_exc(_raise(KeyError("boom")))
    assert a != b

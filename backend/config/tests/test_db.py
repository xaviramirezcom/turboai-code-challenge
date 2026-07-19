"""Pooler-aware connection settings (config/db.py).

Getting this wrong is not a slow app but a broken one: session mode exhausts
Supabase's 15 slots and new connections fail with EMAXCONNSESSION, while
transaction mode with prepared statements left on fails under pgbouncer.
"""

from typing import Any

from config.db import tune_connection

PG = "django.db.backends.postgresql"


def _pg(port: int) -> dict[str, Any]:
    return {"ENGINE": PG, "PORT": port, "NAME": "postgres"}


def test_transaction_pooler_does_not_hold_connections() -> None:
    # 6543 pools server-side; persisting here would re-create slot exhaustion.
    config = tune_connection(_pg(6543), session_conn_max_age=600)
    assert config["CONN_MAX_AGE"] == 0
    assert config["CONN_HEALTH_CHECKS"] is False


def test_transaction_pooler_disables_prepared_statements() -> None:
    # psycopg's server-side prepared statements outlive a pgbouncer transaction.
    config = tune_connection(_pg(6543), session_conn_max_age=600)
    assert config["OPTIONS"]["prepare_threshold"] is None


def test_transaction_pooler_keeps_existing_options() -> None:
    config = tune_connection(
        {**_pg(6543), "OPTIONS": {"sslmode": "require"}}, session_conn_max_age=600
    )
    assert config["OPTIONS"]["sslmode"] == "require"
    assert config["OPTIONS"]["prepare_threshold"] is None


def test_session_mode_persists_connections() -> None:
    # 5432 pins a slot per client, so reuse is what makes a remote DB usable.
    config = tune_connection(_pg(5432), session_conn_max_age=600)
    assert config["CONN_MAX_AGE"] == 600
    assert config["CONN_HEALTH_CHECKS"] is True
    assert "prepare_threshold" not in config.get("OPTIONS", {})


def test_sqlite_is_left_untouched() -> None:
    # The USE_SQLITE escape hatch and the test DB must not get psycopg options.
    config = tune_connection(
        {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"},
        session_conn_max_age=600,
    )
    assert config == {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}


def test_port_as_string_is_recognised() -> None:
    # dj-database-url / django-environ may hand back the port as a string.
    config = tune_connection({**_pg(6543), "PORT": "6543"}, session_conn_max_age=600)
    assert config["CONN_MAX_AGE"] == 0

"""Connection tuning for the Supabase connection pooler.

Supabase exposes two pooler endpoints, and the right Django settings differ:

* **6543 — transaction mode.** A server connection is held only for the length
  of a transaction, so many clients share few slots. The pooler does the
  pooling, so Django must NOT hold connections open (``CONN_MAX_AGE = 0``), and
  psycopg's server-side prepared statements must be disabled — they outlive a
  transaction and break under pgbouncer.
* **5432 — session mode.** A server connection is pinned to a client for its
  whole life, capped at ``pool_size`` (15 by default). Persisting connections is
  what makes a remote DB usable here, but every persisted connection squats a
  slot for ``CONN_MAX_AGE`` seconds — exhaust them and new connections fail with
  ``EMAXCONNSESSION``.

The mode is inferred from the port so a single ``DATABASE_URL`` change switches
everything consistently.
"""

from typing import Any

TRANSACTION_POOLER_PORT = 6543
"""Supabase's transaction-mode pooler port (5432 is session mode)."""


def tune_connection(
    config: dict[str, Any], session_conn_max_age: int
) -> dict[str, Any]:
    """Apply pooler-appropriate connection settings to one DATABASES entry.

    Returns the same dict, mutated. Non-PostgreSQL backends (SQLite in tests and
    the USE_SQLITE escape hatch) are left untouched — the options below are
    psycopg-specific.
    """
    if "postgresql" not in config.get("ENGINE", ""):
        return config

    if str(config.get("PORT") or "") == str(TRANSACTION_POOLER_PORT):
        # The pooler owns connection reuse; holding them here would re-create
        # the slot exhaustion transaction mode exists to avoid.
        config["CONN_MAX_AGE"] = 0
        config["CONN_HEALTH_CHECKS"] = False
        options = config.setdefault("OPTIONS", {})
        options["prepare_threshold"] = None
    else:
        config["CONN_MAX_AGE"] = session_conn_max_age
        config["CONN_HEALTH_CHECKS"] = True

    return config

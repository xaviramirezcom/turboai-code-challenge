"""Django ORM models for the notes context — persistence only.

Business rules live in the domain; these are dumb rows. Repositories map these
to/from domain entities and never leak ORM objects past their boundary.
"""

import uuid

from django.conf import settings
from django.db import models


class CategoryORM(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7)  # #RRGGBB
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="uniq_category_owner_name"
            )
        ]
        ordering = ["id"]


class NoteORM(models.Model):
    # UUID pk so an offline-created note keeps the same id after sync
    # (see specs/collaboration).
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, blank=True, default="")
    content = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        CategoryORM, on_delete=models.CASCADE, related_name="notes"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # Set explicitly by the service (not auto_now) so category-only and content
    # edits both bump it deterministically.
    last_edited_at = models.DateTimeField()

    # Concurrency (specs/collaboration): optimistic version + advisory lock.
    # The lock holder is a client SESSION token (one editing session per note),
    # so a single owner's two tabs/devices block each other.
    version = models.PositiveIntegerField(default=1)
    locked_by_session = models.CharField(max_length=64, null=True, blank=True)
    lock_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notes"
        ordering = ["-last_edited_at"]

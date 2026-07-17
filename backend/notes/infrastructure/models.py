"""Django ORM models for the notes context — persistence only.

Business rules live in the domain; these are dumb rows. Repositories map these
to/from domain entities and never leak ORM objects past their boundary.
"""

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

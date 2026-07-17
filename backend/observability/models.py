"""Append-only operational log tables. NEVER DELETE rows — resolve in place."""

import uuid

from django.db import models


class RequestLog(models.Model):
    request_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    status_code = models.PositiveSmallIntegerField(null=True)
    duration_ms = models.PositiveIntegerField(null=True)
    user = models.CharField(max_length=150, null=True, blank=True)
    ip = models.GenericIPAddressField(null=True)
    metadata = models.JSONField(default=dict)  # redacted query/params
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class EventLog(models.Model):
    request_id = models.UUIDField(null=True, db_index=True)
    action = models.CharField(max_length=100, db_index=True)  # 'user.registered'
    actor = models.CharField(max_length=150, null=True, blank=True)
    entity_type = models.CharField(max_length=100, null=True)
    entity_id = models.CharField(max_length=100, null=True, db_index=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ErrorLog(models.Model):
    request_id = models.UUIDField(null=True, db_index=True)
    fingerprint = models.CharField(max_length=64, db_index=True)  # grouping key
    level = models.CharField(max_length=20, default="ERROR")
    logger = models.CharField(max_length=200, null=True)
    exc_type = models.CharField(max_length=200, null=True)
    message = models.TextField()
    traceback = models.TextField(null=True)
    method = models.CharField(max_length=10, null=True)
    path = models.CharField(max_length=500, null=True)
    metadata = models.JSONField(default=dict)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=150, null=True, blank=True)
    resolution_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

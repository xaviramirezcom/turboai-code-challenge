"""DRF serializers — shape/format validation only. Business rules stay inward."""

from rest_framework import serializers


class NoteCreateSerializer(serializers.Serializer[dict[str, object]]):
    category_id = serializers.IntegerField(required=False)
    id = serializers.UUIDField(required=False)  # client UUID for offline create (3.4)


class NoteUpdateSerializer(serializers.Serializer[dict[str, object]]):
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)
    content = serializers.CharField(required=False, allow_blank=True)
    category_id = serializers.IntegerField(required=False)
    base_version = serializers.IntegerField(required=False)  # optimistic (6.2)


class CategoryOutSerializer(serializers.Serializer[dict[str, object]]):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    is_default = serializers.BooleanField()
    note_count = serializers.IntegerField()


class NoteCategoryOutSerializer(serializers.Serializer[dict[str, object]]):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()


class NoteOutSerializer(serializers.Serializer[dict[str, object]]):
    id = serializers.UUIDField()
    title = serializers.CharField(allow_blank=True)
    content = serializers.CharField(allow_blank=True)
    category_id = serializers.IntegerField()
    category = NoteCategoryOutSerializer()
    created_at = serializers.DateTimeField()
    last_edited_at = serializers.DateTimeField()
    # Collaboration: optimistic version + advisory-lock state (session + expiry).
    version = serializers.IntegerField()
    locked_by = serializers.CharField(allow_null=True)
    lock_expires_at = serializers.DateTimeField(allow_null=True)

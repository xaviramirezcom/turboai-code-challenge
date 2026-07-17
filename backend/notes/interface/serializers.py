"""DRF serializers — shape/format validation only. Business rules stay inward."""

from rest_framework import serializers

from ..domain.entities import Category


class NoteCreateSerializer(serializers.Serializer[dict[str, object]]):
    category_id = serializers.IntegerField(required=False)


class NoteUpdateSerializer(serializers.Serializer[dict[str, object]]):
    title = serializers.CharField(required=False, allow_blank=True, max_length=200)
    content = serializers.CharField(required=False, allow_blank=True)
    category_id = serializers.IntegerField(required=False)


class CategoryOutSerializer(serializers.Serializer[Category]):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    is_default = serializers.BooleanField()


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

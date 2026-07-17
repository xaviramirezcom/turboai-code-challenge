"""DRF serializers — shape/format validation only. Business rules stay inward."""

from rest_framework import serializers

from ..application.services import AuthResult


class CredentialsSerializer(serializers.Serializer[dict[str, str]]):
    # max_length matches Django's User.username (email is the login id), so an
    # over-long email is a clean 400 field error rather than a DB 500.
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )


class UserSerializer(serializers.Serializer[object]):
    id = serializers.IntegerField()
    email = serializers.EmailField()


class AuthResultSerializer(serializers.Serializer[AuthResult]):
    token = serializers.CharField()
    user = UserSerializer()

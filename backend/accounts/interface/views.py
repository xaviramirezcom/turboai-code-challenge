"""Thin HTTP adapter: translate request → command, call the use case, serialize.

No business logic here — that lives in the AuthService.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..application.commands import Login, Register
from ..container import auth_service
from ..domain.exceptions import (
    EmailAlreadyRegistered,
    InvalidCredentials,
    WeakPassword,
)
from .serializers import AuthResultSerializer, CredentialsSerializer


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        data = CredentialsSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            result = auth_service().register(
                Register(
                    email=data.validated_data["email"],
                    password=data.validated_data["password"],
                )
            )
        except WeakPassword as exc:
            return Response(
                {"password": exc.messages}, status=status.HTTP_400_BAD_REQUEST
            )
        except EmailAlreadyRegistered:
            return Response(
                {"email": ["This email is already registered."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            AuthResultSerializer(result).data, status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        data = CredentialsSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            result = auth_service().login(
                Login(
                    email=data.validated_data["email"],
                    password=data.validated_data["password"],
                )
            )
        except InvalidCredentials:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(AuthResultSerializer(result).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    def post(self, request: Request) -> Response:
        auth_service().logout(request.user.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

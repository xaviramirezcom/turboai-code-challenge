"""Django adapter for the UserRepository port.

Reuses Django's ``User`` (username == email) so we get password hashing and the
auth machinery for free. Returns the framework-free ``UserAccount``, never the
ORM object.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError

from ..domain.entities import UserAccount
from ..domain.exceptions import EmailAlreadyRegistered

User = get_user_model()


class DjangoUserRepository:
    def exists_by_email(self, email: str) -> bool:
        return User.objects.filter(username=email).exists()

    def create_user(self, email: str, raw_password: str) -> UserAccount:
        try:
            user = User.objects.create_user(
                username=email, email=email, password=raw_password
            )
        except IntegrityError as exc:  # unique-constraint race → domain error
            raise EmailAlreadyRegistered(email) from exc
        return UserAccount(id=user.pk, email=user.email)

    def verify_credentials(self, email: str, raw_password: str) -> UserAccount | None:
        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            return None
        if not user.is_active or not user.check_password(raw_password):
            return None
        return UserAccount(id=user.pk, email=user.email)

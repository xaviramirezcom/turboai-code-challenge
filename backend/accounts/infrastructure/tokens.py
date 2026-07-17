"""DRF token adapter for the TokenIssuer port (one token per user)."""

from rest_framework.authtoken.models import Token


class DrfTokenIssuer:
    def issue(self, user_id: int) -> str:
        token, _ = Token.objects.get_or_create(user_id=user_id)
        return str(token.key)

    def revoke(self, user_id: int) -> None:
        Token.objects.filter(user_id=user_id).delete()

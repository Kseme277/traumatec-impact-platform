import jwt
from jwt import PyJWKClient

from app.core.config import Settings


class ClerkTokenError(Exception):
    pass


class ClerkTokenVerifier:
    def __init__(self, settings: Settings):
        if not settings.clerk_jwks_url:
            raise ValueError("CLERK_JWKS_URL is required")
        self._issuer = settings.clerk_issuer or None
        self._jwks_client = PyJWKClient(settings.clerk_jwks_url)

    def verify(self, token: str) -> str:
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            decode_kwargs: dict = {
                "algorithms": ["RS256"],
                "options": {"verify_aud": False},
            }
            if self._issuer:
                decode_kwargs["issuer"] = self._issuer

            payload = jwt.decode(token, signing_key.key, **decode_kwargs)
            clerk_id = payload.get("sub")
            if not clerk_id:
                raise ClerkTokenError("Token Clerk invalide: sub manquant")
            return clerk_id
        except jwt.PyJWTError as exc:
            raise ClerkTokenError("Token Clerk invalide ou expiré") from exc

import jwt
from jwt import PyJWKClient

from app.core.config import Settings


class ClerkTokenError(Exception):
    pass


def extract_email_from_payload(payload: dict) -> str | None:
    for key in ("email", "primary_email_address", "primary_email"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()

    email_addresses = payload.get("email_addresses")
    if isinstance(email_addresses, list):
        for entry in email_addresses:
            if not isinstance(entry, dict):
                continue
            address = entry.get("email_address") or entry.get("email")
            if isinstance(address, str) and address.strip():
                return address.strip().lower()
    return None


class ClerkTokenVerifier:
    def __init__(self, settings: Settings):
        if not settings.clerk_jwks_url:
            raise ValueError("CLERK_JWKS_URL is required")
        self._issuer = settings.clerk_issuer or None
        self._jwks_client = PyJWKClient(settings.clerk_jwks_url)

    def _decode(self, token: str, key: str, *, verify_issuer: bool) -> dict:
        decode_kwargs: dict = {
            "algorithms": ["RS256"],
            "options": {"verify_aud": False},
            "leeway": 60,
        }
        if verify_issuer and self._issuer:
            decode_kwargs["issuer"] = self._issuer.rstrip("/")
        return jwt.decode(token, key, **decode_kwargs)

    def decode_payload(self, token: str) -> dict:
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            key = signing_key.key
            try:
                payload = self._decode(token, key, verify_issuer=True)
            except jwt.InvalidIssuerError:
                if not self._issuer:
                    raise
                payload = self._decode(token, key, verify_issuer=False)
            if not payload.get("sub"):
                raise ClerkTokenError("Token Clerk invalide: sub manquant")
            return payload
        except jwt.ExpiredSignatureError as exc:
            raise ClerkTokenError("Session expirée. Reconnectez-vous.") from exc
        except jwt.PyJWTError as exc:
            raise ClerkTokenError("Token Clerk invalide ou expiré") from exc

    def verify(self, token: str) -> str:
        return str(self.decode_payload(token)["sub"])

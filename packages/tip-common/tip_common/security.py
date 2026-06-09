"""Authentification Clerk + contrôle d'accès TIP (utilisateurs identity)."""

from __future__ import annotations

from dataclasses import dataclass
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tip_common.config import BaseServiceSettings
from tip_common.email_identity import email_local_part, emails_match_for_linking, normalize_email

security_scheme = HTTPBearer(auto_error=False)

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


class ClerkTokenError(Exception):
    pass


def extract_email_from_clerk_payload(payload: dict) -> str | None:
    for key in ("email", "primary_email_address", "primary_email"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()
    return None


class ClerkTokenVerifier:
    def __init__(self, settings: BaseServiceSettings):
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


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    clerk_id: str
    email: str
    nom: str
    prenom: str
    role: str
    est_actif: bool

    @property
    def is_admin(self) -> bool:
        return self.role == "administrateur"


def _auth_settings() -> BaseServiceSettings:
    return BaseServiceSettings()


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        settings = _auth_settings()
        _engine = create_async_engine(settings.database_url)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _session_factory


def _row_to_user(row, clerk_id: str) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=row.id,
        clerk_id=clerk_id,
        email=row.email,
        nom=row.nom,
        prenom=row.prenom,
        role=row.role,
        est_actif=row.est_actif,
    )


async def _load_user(clerk_id: str, email: str | None = None) -> AuthenticatedUser | None:
    session_factory = _get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            text(
                """
                SELECT id, clerk_id, email, nom, prenom, role, est_actif
                FROM identity.utilisateurs
                WHERE clerk_id = :clerk_id
                """
            ),
            {"clerk_id": clerk_id},
        )
        row = result.one_or_none()
        if row is not None:
            if email and normalize_email(row.email) != normalize_email(email):
                await session.execute(
                    text(
                        """
                        UPDATE identity.utilisateurs
                        SET email = :email
                        WHERE id = :user_id
                        """
                    ),
                    {"email": normalize_email(email), "user_id": row.id},
                )
                await session.commit()
                result = await session.execute(
                    text(
                        """
                        SELECT id, clerk_id, email, nom, prenom, role, est_actif
                        FROM identity.utilisateurs
                        WHERE id = :user_id
                        """
                    ),
                    {"user_id": row.id},
                )
                row = result.one()
            return _row_to_user(row, clerk_id)

        if not email:
            return None

        clerk_email = normalize_email(email)
        result = await session.execute(
            text(
                """
                SELECT id, clerk_id, email, nom, prenom, role, est_actif
                FROM identity.utilisateurs
                WHERE lower(email) = :email
                """
            ),
            {"email": clerk_email},
        )
        row = result.one_or_none()
        if row is not None:
            await session.execute(
                text(
                    """
                    UPDATE identity.utilisateurs
                    SET clerk_id = :clerk_id, email = :email
                    WHERE id = :user_id
                    """
                ),
                {"clerk_id": clerk_id, "email": clerk_email, "user_id": row.id},
            )
            await session.commit()
            result = await session.execute(
                text(
                    """
                    SELECT id, clerk_id, email, nom, prenom, role, est_actif
                    FROM identity.utilisateurs
                    WHERE id = :user_id
                    """
                ),
                {"user_id": row.id},
            )
            return _row_to_user(result.one(), clerk_id)

        local = email_local_part(clerk_email)
        result = await session.execute(
            text(
                """
                SELECT id, clerk_id, email, nom, prenom, role, est_actif
                FROM identity.utilisateurs
                WHERE lower(email) LIKE :pattern
                """
            ),
            {"pattern": f"{local}@%"},
        )
        candidates = result.fetchall()
        matches = [r for r in candidates if emails_match_for_linking(r.email, clerk_email)]
        if len(matches) == 1:
            row = matches[0]
            await session.execute(
                text(
                    """
                    UPDATE identity.utilisateurs
                    SET clerk_id = :clerk_id, email = :email
                    WHERE id = :user_id
                    """
                ),
                {"clerk_id": clerk_id, "email": clerk_email, "user_id": row.id},
            )
            await session.commit()
            result = await session.execute(
                text(
                    """
                    SELECT id, clerk_id, email, nom, prenom, role, est_actif
                    FROM identity.utilisateurs
                    WHERE id = :user_id
                    """
                ),
                {"user_id": row.id},
            )
            return _row_to_user(result.one(), clerk_id)

        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
        )

    try:
        verifier = ClerkTokenVerifier(_auth_settings())
        payload = verifier.decode_payload(credentials.credentials)
        clerk_id = str(payload["sub"])
        email = extract_email_from_clerk_payload(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentification indisponible (CLERK_JWKS_URL manquant côté service)",
        ) from exc
    except ClerkTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user = await _load_user(clerk_id, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte non autorisé sur cette plateforme",
        )

    if not user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez un administrateur.",
        )

    return user


async def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return user

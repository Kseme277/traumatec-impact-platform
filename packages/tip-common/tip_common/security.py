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
from tip_common.roles import (
    can_generate_packages,
    can_review_procedure,
    can_submit_packages,
    can_validate_final,
    can_view_users,
    has_any_role,
    has_role,
    is_admin_roles,
    normalize_roles,
    primary_role,
)

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
    roles: tuple[str, ...]
    est_actif: bool

    @property
    def is_admin(self) -> bool:
        return is_admin_roles(list(self.roles))

    def has_role(self, role: str) -> bool:
        return has_role(list(self.roles), role)

    def has_any_role(self, *roles: str) -> bool:
        return has_any_role(list(self.roles), *roles)


def _auth_settings() -> BaseServiceSettings:
    return BaseServiceSettings()


def _get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        settings = _auth_settings()
        _engine = create_async_engine(settings.database_url)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _session_factory


async def _load_roles_for_user(session: AsyncSession, user_id: int, fallback_role: str) -> tuple[str, ...]:
    result = await session.execute(
        text("SELECT role FROM identity.user_roles WHERE user_id = :user_id ORDER BY role"),
        {"user_id": user_id},
    )
    roles = normalize_roles([row.role for row in result.fetchall()], fallback_role=fallback_role)
    return tuple(roles)


def _row_to_user(row, clerk_id: str, roles: tuple[str, ...]) -> AuthenticatedUser:
    primary = primary_role(list(roles)) if roles else row.role
    return AuthenticatedUser(
        id=row.id,
        clerk_id=clerk_id,
        email=row.email,
        nom=row.nom,
        prenom=row.prenom,
        role=primary,
        roles=roles,
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
            roles = await _load_roles_for_user(session, row.id, row.role)
            return _row_to_user(row, clerk_id, roles)

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
            row = result.one()
            roles = await _load_roles_for_user(session, row.id, row.role)
            return _row_to_user(row, clerk_id, roles)

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
            row = result.one()
            roles = await _load_roles_for_user(session, row.id, row.role)
            return _row_to_user(row, clerk_id, roles)

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

    await _touch_user_session(user.id)

    return user


async def _touch_user_session(user_id: int) -> None:
    session_factory = _get_session_factory()
    async with session_factory() as session:
        await session.execute(
            text(
                """
                UPDATE identity.utilisateurs
                SET last_access = now(),
                    activation_date = COALESCE(activation_date, now())
                WHERE id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        await session.commit()


async def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return user


def _require_roles(*required: str, detail: str):
    async def _guard(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if not user.has_any_role(*required):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
        return user

    return _guard


require_role = lambda role, detail=None: _require_roles(
    role, detail=detail or f"Accès réservé au rôle {role}"
)

require_support_or_admin = _require_roles(
    "administrateur",
    "support_administratif",
    detail="Accès réservé au support administratif ou aux administrateurs",
)

require_controle = _require_roles(
    "administrateur",
    "controle_procedure",
    detail="Accès réservé au contrôle procédure ou aux administrateurs",
)

require_validateur = _require_roles(
    "administrateur",
    "validateur",
    detail="Accès réservé aux validateurs ou aux administrateurs",
)

async def require_can_generate(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not can_generate_packages(list(user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Génération réservée au support administratif ou aux administrateurs",
        )
    return user


async def require_can_submit(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not can_submit_packages(list(user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Soumission réservée au support administratif ou aux administrateurs",
        )
    return user


async def require_can_review_procedure(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contrôle procédure non autorisé",
        )
    return user


async def require_can_validate_final(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not can_validate_final(list(user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Validation finale non autorisée",
        )
    return user


async def require_can_view_users(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not can_view_users(list(user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Liste utilisateurs non autorisée",
        )
    return user

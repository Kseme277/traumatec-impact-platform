import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.utilisateur import Utilisateur
from app.services.clerk_token import ClerkTokenError, ClerkTokenVerifier, extract_email_from_payload
from app.services.user_linking import resolve_utilisateur_for_clerk

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)


def get_token_verifier(settings: Settings = Depends(get_settings)) -> ClerkTokenVerifier:
    return ClerkTokenVerifier(settings)


async def _resolve_utilisateur(
    db: AsyncSession,
    settings: Settings,
    *,
    clerk_id: str,
    token: str,
    verifier: ClerkTokenVerifier,
) -> Utilisateur | None:
    try:
        payload = verifier.decode_payload(token)
        email = extract_email_from_payload(payload)
    except ClerkTokenError:
        email = None

    return await resolve_utilisateur_for_clerk(
        db,
        settings,
        clerk_id=clerk_id,
        clerk_email=email,
    )


async def get_current_utilisateur(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
    verifier: ClerkTokenVerifier = Depends(get_token_verifier),
    settings: Settings = Depends(get_settings),
) -> Utilisateur:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
        )

    try:
        clerk_id = verifier.verify(credentials.credentials)
    except ClerkTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    utilisateur = await _resolve_utilisateur(
        db,
        settings,
        clerk_id=clerk_id,
        token=credentials.credentials,
        verifier=verifier,
    )

    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Compte non autorisé sur cette plateforme. "
                "Connectez-vous avec l'email exact de votre invitation TIP "
                "(identique à votre compte Google si vous utilisez OAuth)."
            ),
        )

    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez un administrateur.",
        )

    return utilisateur


async def require_admin(
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
) -> Utilisateur:
    if not utilisateur.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return utilisateur

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.utilisateur import Utilisateur
from app.services.clerk_token import ClerkTokenError, ClerkTokenVerifier

security_scheme = HTTPBearer(auto_error=False)


def get_token_verifier(settings: Settings = Depends(get_settings)) -> ClerkTokenVerifier:
    return ClerkTokenVerifier(settings)


async def get_current_utilisateur(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
    verifier: ClerkTokenVerifier = Depends(get_token_verifier),
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

    result = await db.execute(select(Utilisateur).where(Utilisateur.clerk_id == clerk_id))
    utilisateur = result.scalar_one_or_none()

    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte non autorisé sur cette plateforme",
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

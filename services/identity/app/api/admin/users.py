import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import (
    ToggleStatusResponse,
    UtilisateurCreate,
    UtilisateurResponse,
)
from app.services.clerk_client import ClerkAPIError, ClerkClient
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter()


async def _send_invitation_email(
    *,
    settings,
    to_email: str,
    prenom: str,
    nom: str,
    invitation_url: str | None,
) -> None:
    if not invitation_url:
        return
    mailer = EmailService(settings)
    try:
        await mailer.send_invitation(
            to_email=to_email,
            prenom=prenom,
            nom=nom,
            invitation_url=invitation_url,
        )
    except Exception:
        logger.exception("Invitation créée mais email non envoyé à %s", to_email)


@router.post("/create", response_model=UtilisateurResponse, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(
    payload: UtilisateurCreate,
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Utilisateur:
    settings = get_settings()
    if not settings.clerk_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk n'est pas configuré (CLERK_SECRET_KEY manquant)",
        )

    existing = await db.execute(select(Utilisateur).where(Utilisateur.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un utilisateur avec cet email existe déjà",
        )

    clerk = ClerkClient(settings)
    try:
        result = await clerk.create_user_with_invitation(
            email=str(payload.email),
            nom=payload.nom,
            prenom=payload.prenom,
            role=payload.role,
        )
        clerk_id = result.clerk_id
        await _send_invitation_email(
            settings=settings,
            to_email=str(payload.email).lower(),
            prenom=payload.prenom,
            nom=payload.nom,
            invitation_url=result.invitation_url,
        )
    except ClerkAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    utilisateur = Utilisateur(
        clerk_id=clerk_id,
        email=str(payload.email).lower(),
        nom=payload.nom,
        prenom=payload.prenom,
        role=payload.role,
        est_actif=True,
    )
    db.add(utilisateur)
    await db.commit()
    await db.refresh(utilisateur)
    return utilisateur


@router.get("", response_model=list[UtilisateurResponse])
async def list_utilisateurs(
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Utilisateur]:
    result = await db.execute(select(Utilisateur).order_by(Utilisateur.created_at.desc()))
    return list(result.scalars().all())


@router.patch("/{user_id}/toggle-status", response_model=ToggleStatusResponse)
async def toggle_utilisateur_status(
    user_id: int,
    admin: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ToggleStatusResponse:
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas désactiver votre propre compte",
        )

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    utilisateur.est_actif = not utilisateur.est_actif
    settings = get_settings()

    if utilisateur.clerk_id and settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        try:
            await clerk.set_user_banned(utilisateur.clerk_id, banned=not utilisateur.est_actif)
        except ClerkAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

    await db.commit()
    await db.refresh(utilisateur)

    state = "activé" if utilisateur.est_actif else "désactivé"
    return ToggleStatusResponse(
        id=utilisateur.id,
        est_actif=utilisateur.est_actif,
        message=f"Utilisateur {state} avec succès",
    )


@router.post("/{user_id}/resend-invitation", response_model=ToggleStatusResponse)
async def resend_invitation(
    user_id: int,
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ToggleStatusResponse:
    settings = get_settings()
    if not settings.clerk_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk n'est pas configuré (CLERK_SECRET_KEY manquant)",
        )

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de renvoyer une invitation à un utilisateur désactivé",
        )

    clerk = ClerkClient(settings)
    try:
        invitation_url = await clerk.create_invitation_only(
            email=utilisateur.email,
            role=utilisateur.role,
        )
        await _send_invitation_email(
            settings=settings,
            to_email=utilisateur.email,
            prenom=utilisateur.prenom,
            nom=utilisateur.nom,
            invitation_url=invitation_url,
        )
    except ClerkAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not invitation_url:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une invitation est déjà en cours pour cet utilisateur",
        )

    return ToggleStatusResponse(
        id=utilisateur.id,
        est_actif=utilisateur.est_actif,
        message="Invitation renvoyée par email",
    )

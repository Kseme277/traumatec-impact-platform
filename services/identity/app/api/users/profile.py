from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.deps.auth import get_current_utilisateur
from app.core.database import get_db
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurMeResponse, UtilisateurMeUpdate
from app.services.audit_service import record_audit_event
from app.services.clerk_client import ClerkAPIError, ClerkClient
from app.services.user_roles import load_user_roles
from tip_common.roles import primary_role

router = APIRouter()


def _to_me_response(utilisateur: Utilisateur, roles: list[str]) -> UtilisateurMeResponse:
    return UtilisateurMeResponse(
        id=utilisateur.id,
        clerk_id=utilisateur.clerk_id,
        username=utilisateur.username,
        email=utilisateur.email,
        nom=utilisateur.nom,
        prenom=utilisateur.prenom,
        phone=utilisateur.phone,
        role=primary_role(roles),
        roles=roles,
        est_actif=utilisateur.est_actif,
        created_at=utilisateur.created_at,
        activation_date=utilisateur.activation_date,
        deactivation_date=utilisateur.deactivation_date,
        last_access=utilisateur.last_access,
    )


@router.get("/me", response_model=UtilisateurMeResponse)
async def get_me(
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> UtilisateurMeResponse:
    roles = await load_user_roles(db, utilisateur.id, utilisateur.role)
    return _to_me_response(utilisateur, roles)


@router.patch("/me", response_model=UtilisateurMeResponse)
async def update_me(
    payload: UtilisateurMeUpdate,
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> Utilisateur:
    settings = get_settings()
    utilisateur.nom = payload.nom.strip()
    utilisateur.prenom = payload.prenom.strip()

    if utilisateur.clerk_id and settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        try:
            await clerk.update_user_names(
                utilisateur.clerk_id,
                prenom=utilisateur.prenom,
                nom=utilisateur.nom,
            )
        except ClerkAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

    await record_audit_event(
        db,
        actor_id=utilisateur.id,
        action="profile.update",
        entity_type="user",
        entity_id=str(utilisateur.id),
        payload={"prenom": utilisateur.prenom, "nom": utilisateur.nom},
    )
    await db.commit()
    await db.refresh(utilisateur)
    roles = await load_user_roles(db, utilisateur.id, utilisateur.role)
    return _to_me_response(utilisateur, roles)

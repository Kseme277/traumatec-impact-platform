import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import (
    EmailCheckResponse,
    InvitationActionResponse,
    ToggleStatusResponse,
    UtilisateurCreate,
    UtilisateurCreateResponse,
    UtilisateurResponse,
    UtilisateurRolesUpdate,
)
from app.services.audit_service import record_audit_event
from app.services.clerk_client import ClerkAPIError, ClerkClient
from app.services.email_service import EmailService
from app.services.user_avatars import resolve_avatar_map, resolve_avatar_url
from app.services.user_roles import load_user_roles, set_user_roles
from tip_common.email_identity import email_local_part, normalize_email
from tip_common.roles import normalize_roles, primary_role

logger = logging.getLogger(__name__)

router = APIRouter()


async def _deliver_invitation_email(
    settings,
    *,
    to_email: str,
    prenom: str,
    nom: str,
    invitation_url: str | None,
    clerk_notified: bool,
) -> tuple[bool, str | None]:
    """Clerk notify + optionnellement SMTP TIP (copie de secours avec le lien)."""
    smtp_sent = False
    if (
        invitation_url
        and settings.smtp_enabled
        and settings.invitation_smtp_fallback
    ):
        try:
            mailer = EmailService(settings)
            await mailer.send_invitation(
                to_email=to_email,
                prenom=prenom,
                nom=nom,
                invitation_url=invitation_url,
            )
            smtp_sent = True
        except Exception:
            logger.exception("Échec envoi SMTP invitation à %s", to_email)

    if smtp_sent or clerk_notified:
        hint = None
        if clerk_notified and not smtp_sent:
            hint = (
                "Email envoyé par Clerk — vérifiez l'onglet Promotions ou Courrier indésirable "
                "(Gmail classe souvent les invitations Traumatec)."
            )
        return True, hint

    if invitation_url:
        return False, (
            "Compte créé. Copiez le lien d'invitation ci-dessous et transmettez-le à l'utilisateur."
        )

    return False, (
        "Compte créé mais l'activation Clerk a échoué. "
        f"Ajoutez {settings.app_public_url.rstrip('/')}/accept-invitation dans Clerk → Paths / URLs de redirection, "
        "puis utilisez « Renvoyer l'invitation »."
    )


def _clerk_sent_activation_email(invitation_url: str | None) -> bool:
    """True si Clerk a envoyé l'email (invitation hébergée), pas pour un lien jeton TIP."""
    if not invitation_url:
        return False
    return "accept-invitation?ticket=" not in invitation_url


async def _user_response(
    db: AsyncSession,
    utilisateur: Utilisateur,
    *,
    avatar_url: str | None = None,
) -> UtilisateurResponse:
    roles = await load_user_roles(db, utilisateur.id, utilisateur.role)
    primary = primary_role(roles)
    if avatar_url is None and utilisateur.clerk_id:
        settings = get_settings()
        avatar_url = await resolve_avatar_url(settings, utilisateur.clerk_id)
    return UtilisateurResponse(
        id=utilisateur.id,
        clerk_id=utilisateur.clerk_id,
        username=utilisateur.username,
        email=utilisateur.email,
        nom=utilisateur.nom,
        prenom=utilisateur.prenom,
        phone=utilisateur.phone,
        role=primary,
        roles=roles,
        est_actif=utilisateur.est_actif,
        created_at=utilisateur.created_at,
        activation_date=utilisateur.activation_date,
        deactivation_date=utilisateur.deactivation_date,
        last_access=utilisateur.last_access,
        avatar_url=avatar_url,
    )


@router.get("/check-email", response_model=EmailCheckResponse)
async def check_invitation_email(
    email: str,
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> EmailCheckResponse:
    """Vérifie les doublons TIP / Clerk avant création (évite les emails proches)."""
    settings = get_settings()
    normalized = normalize_email(email)

    tip_exists = False
    result = await db.execute(select(Utilisateur).where(Utilisateur.email == normalized))
    if result.scalar_one_or_none():
        tip_exists = True

    clerk_exists = False
    conflicting: list[str] = []
    suggested: str | None = None

    if settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        clerk_id = await clerk.find_user_id_by_email(normalized)
        clerk_exists = clerk_id is not None
        variants = await clerk.find_clerk_emails_for_local_part(normalized)
        conflicting = [v for v in variants if v != normalized]
        if conflicting:
            suggested = conflicting[0]

    can_create = not tip_exists and not conflicting
    message: str | None = None
    if tip_exists:
        message = "Cet email est déjà enregistré dans TIP."
    elif conflicting and suggested:
        message = (
            f"Un compte Clerk existe déjà avec {suggested}. "
            "Utilisez cet email exact pour l'invitation."
        )

    return EmailCheckResponse(
        normalized_email=normalized,
        tip_exists=tip_exists,
        clerk_exists=clerk_exists,
        conflicting_clerk_emails=conflicting,
        suggested_email=suggested,
        can_create=can_create,
        message=message,
    )


@router.post("/create", response_model=UtilisateurCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(
    payload: UtilisateurCreate,
    admin: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UtilisateurCreateResponse:
    settings = get_settings()
    if not settings.clerk_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk n'est pas configuré (CLERK_SECRET_KEY manquant)",
        )

    normalized_email = normalize_email(str(payload.email))

    existing = await db.execute(select(Utilisateur).where(Utilisateur.email == normalized_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un utilisateur avec cet email existe déjà",
        )

    clerk = ClerkClient(settings)
    roles = normalize_roles(
        list(payload.roles or []),
        fallback_role=payload.role or "support_administratif",
    )
    primary = primary_role(roles)
    try:
        result = await clerk.provision_user_with_invitation(
            email=normalized_email,
            nom=payload.nom,
            prenom=payload.prenom,
            role=primary,
            roles=roles,
        )
        clerk_id = result.clerk_id
        primary_email = (
            await clerk.get_primary_email(clerk_id) if clerk_id else normalized_email
        ) or normalized_email
        invitation_url = result.invitation_url
        invitation_sent, invitation_hint = await _deliver_invitation_email(
            settings,
            to_email=primary_email,
            prenom=payload.prenom,
            nom=payload.nom,
            invitation_url=invitation_url,
            clerk_notified=_clerk_sent_activation_email(invitation_url),
        )
        if not invitation_sent:
            logger.warning(
                "Utilisateur Clerk créé pour %s mais email d'invitation non confirmé",
                primary_email,
            )
    except ClerkAPIError as exc:
        status_code = (
            status.HTTP_409_CONFLICT
            if exc.status_code == 409
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    username = (payload.username or email_local_part(primary_email) or "user").strip().lower()
    base_username = username
    suffix = 1
    while True:
        check = await db.execute(select(Utilisateur).where(Utilisateur.username == username))
        if check.scalar_one_or_none() is None:
            break
        suffix += 1
        username = f"{base_username}{suffix}"

    utilisateur = Utilisateur(
        clerk_id=clerk_id,
        username=username,
        email=primary_email,
        nom=payload.nom,
        prenom=payload.prenom,
        phone=payload.phone,
        role=primary,
        est_actif=True,
    )
    db.add(utilisateur)
    await db.flush()
    await set_user_roles(db, utilisateur.id, roles)
    await record_audit_event(
        db,
        actor_id=admin.id,
        action="user.create",
        entity_type="user",
        entity_id=str(utilisateur.id),
        payload={"email": utilisateur.email, "role": utilisateur.role},
    )
    await db.commit()
    await db.refresh(utilisateur)
    return UtilisateurCreateResponse(
        id=utilisateur.id,
        clerk_id=utilisateur.clerk_id,
        email=utilisateur.email,
        nom=utilisateur.nom,
        prenom=utilisateur.prenom,
        role=primary,
        roles=roles,
        est_actif=utilisateur.est_actif,
        created_at=utilisateur.created_at,
        invitation_sent=invitation_sent,
        invitation_url=invitation_url,
        invitation_hint=invitation_hint,
    )


@router.get("", response_model=list[UtilisateurResponse])
async def list_utilisateurs(
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UtilisateurResponse]:
    result = await db.execute(select(Utilisateur).order_by(Utilisateur.created_at.desc()))
    users = list(result.scalars().all())
    settings = get_settings()
    avatars = await resolve_avatar_map(settings, users)
    return [
        await _user_response(db, user, avatar_url=avatars.get(user.id))
        for user in users
    ]


@router.patch("/{user_id}/roles", response_model=UtilisateurResponse)
async def update_utilisateur_roles(
    user_id: int,
    payload: UtilisateurRolesUpdate,
    admin: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UtilisateurResponse:
    if admin.id == user_id and "administrateur" not in normalize_roles(list(payload.roles)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas retirer votre propre rôle administrateur",
        )

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    roles = normalize_roles(list(payload.roles))
    await set_user_roles(db, utilisateur.id, roles)
    utilisateur.role = primary_role(roles)

    settings = get_settings()
    if utilisateur.clerk_id and settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        try:
            await clerk.sync_public_metadata(utilisateur.clerk_id, roles=roles)
        except ClerkAPIError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    await record_audit_event(
        db,
        actor_id=admin.id,
        action="user.update_roles",
        entity_type="user",
        entity_id=str(utilisateur.id),
        payload={"roles": roles},
    )
    await db.commit()
    await db.refresh(utilisateur)
    return await _user_response(db, utilisateur)


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
    if utilisateur.est_actif:
        utilisateur.deactivation_date = None
    else:
        utilisateur.deactivation_date = datetime.now(timezone.utc)
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

    await record_audit_event(
        db,
        actor_id=admin.id,
        action="user.toggle_status",
        entity_type="user",
        entity_id=str(utilisateur.id),
        payload={"est_actif": utilisateur.est_actif},
    )
    await db.commit()
    await db.refresh(utilisateur)

    state = "activé" if utilisateur.est_actif else "désactivé"
    return ToggleStatusResponse(
        id=utilisateur.id,
        est_actif=utilisateur.est_actif,
        message=f"Utilisateur {state} avec succès",
    )


@router.post("/{user_id}/resend-invitation", response_model=InvitationActionResponse)
async def resend_invitation(
    user_id: int,
    admin: Utilisateur = Depends(require_admin),
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
    roles = await load_user_roles(db, utilisateur.id, utilisateur.role)
    primary = primary_role(roles)
    try:
        if utilisateur.clerk_id:
            await clerk.sync_public_metadata(utilisateur.clerk_id, roles=roles)
        invitation_url = await clerk.create_invitation_only(
            email=utilisateur.email,
            role=primary,
            roles=roles,
            clerk_id=utilisateur.clerk_id,
        )
    except ClerkAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    invitation_sent, hint_extra = await _deliver_invitation_email(
        settings,
        to_email=utilisateur.email,
        prenom=utilisateur.prenom,
        nom=utilisateur.nom,
        invitation_url=invitation_url,
        clerk_notified=_clerk_sent_activation_email(invitation_url),
    )

    if not invitation_url and not invitation_sent:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Activation Clerk impossible. "
                f"Vérifiez {settings.app_public_url.rstrip('/')}/accept-invitation dans le dashboard Clerk."
            ),
        )

    await record_audit_event(
        db,
        actor_id=admin.id,
        action="user.resend_invitation",
        entity_type="user",
        entity_id=str(utilisateur.id),
        payload={"email": utilisateur.email},
    )
    await db.commit()

    message = f"Invitation renvoyée à {utilisateur.email}"
    if hint_extra:
        message = f"{message}. {hint_extra}"
    if invitation_url and not invitation_sent:
        message = f"{message} Copiez le lien d'activation ci-dessous."

    return InvitationActionResponse(
        id=utilisateur.id,
        est_actif=utilisateur.est_actif,
        message=message,
        invitation_url=invitation_url,
        invitation_sent=invitation_sent,
        invitation_hint=hint_extra,
    )


@router.delete("/{user_id}", response_model=ToggleStatusResponse)
async def delete_utilisateur(
    user_id: int,
    admin: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ToggleStatusResponse:
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas supprimer votre propre compte",
        )

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    jobs = await db.execute(
        text("SELECT COUNT(*) FROM docgen.generation_jobs WHERE requested_by_id = :id"),
        {"id": user_id},
    )
    if int(jobs.scalar_one()) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet utilisateur a des générations associées. Désactivez-le plutôt.",
        )

    imports = await db.execute(
        text("SELECT COUNT(*) FROM events.annual_imports WHERE imported_by_id = :id"),
        {"id": user_id},
    )
    if int(imports.scalar_one()) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet utilisateur a des imports associés. Désactivez-le plutôt.",
        )

    settings = get_settings()
    if utilisateur.clerk_id and settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        try:
            await clerk.delete_user(utilisateur.clerk_id)
        except ClerkAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc

    await record_audit_event(
        db,
        actor_id=admin.id,
        action="user.delete",
        entity_type="user",
        entity_id=str(user_id),
        payload={"email": utilisateur.email},
    )
    await db.delete(utilisateur)
    await db.commit()

    return ToggleStatusResponse(
        id=user_id,
        est_actif=False,
        message=f"Utilisateur {utilisateur.prenom} {utilisateur.nom} supprimé",
    )

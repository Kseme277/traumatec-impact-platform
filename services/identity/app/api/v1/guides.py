from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.schemas.guides_bridge import (
    GuidesBridgeConfigResponse,
    GuidesBridgeConfigUpdate,
    GuidesBridgeTestResponse,
)
from app.services.audit_service import record_audit_event
from app.services.guides_bridge import login_guidehub_admin
from app.services.guides_bridge_config import (
    get_bridge_config_view,
    resolve_bridge_credentials,
    update_bridge_config,
)
from app.services.guides_handoff import (
    consume_guides_handoff_ticket,
    create_guides_handoff_ticket,
)

router = APIRouter()


class GuidesHandoffConsumeRequest(BaseModel):
    ticket: str = Field(min_length=16, max_length=128)


@router.get("/bridge-config", response_model=GuidesBridgeConfigResponse)
async def guides_bridge_config_get(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> GuidesBridgeConfigResponse:
    """Identifiants de connexion GuideHub (mot de passe jamais renvoyé)."""
    data = await get_bridge_config_view(db, settings)
    return GuidesBridgeConfigResponse.model_validate(data)


@router.put("/bridge-config", response_model=GuidesBridgeConfigResponse)
async def guides_bridge_config_update(
    payload: GuidesBridgeConfigUpdate,
    actor: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> GuidesBridgeConfigResponse:
    """Met à jour les identifiants GuideHub (stockés en base, prioritaires sur le .env)."""
    if not settings.guides_bridge_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Liaison GuideHub désactivée (GUIDES_BRIDGE_ENABLED=false).",
        )

    credentials_before = await resolve_bridge_credentials(db, settings)
    if not payload.password and not credentials_before.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe GuideHub requis pour la première configuration.",
        )

    try:
        data = await update_bridge_config(
            db,
            settings,
            company_slug=payload.company_slug,
            bridge_email=payload.bridge_email,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await record_audit_event(
        db,
        actor_id=actor.id,
        action="guides.bridge_config.updated",
        entity_type="guides_bridge",
        payload={
            "company_slug": payload.company_slug,
            "bridge_email": payload.bridge_email,
            "password_changed": bool(payload.password),
        },
    )
    await db.commit()
    return GuidesBridgeConfigResponse.model_validate(data)


@router.post("/bridge-config/test", response_model=GuidesBridgeTestResponse)
async def guides_bridge_config_test(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> GuidesBridgeTestResponse:
    """Teste la connexion GuideHub avec les identifiants en vigueur."""
    credentials = await resolve_bridge_credentials(db, settings)
    try:
        session = await login_guidehub_admin(settings, credentials)
    except HTTPException as exc:
        return GuidesBridgeTestResponse(success=False, message=str(exc.detail))
    return GuidesBridgeTestResponse(
        success=True,
        message="Connexion GuideHub réussie.",
        email=session.get("email"),
        role=session.get("role"),
    )


@router.post("/handoff")
async def guides_handoff_prepare(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Prépare un handoff GuideHub sécurisé : le JWT reste côté serveur (Redis, TTL 2 min).
    Le frontend ne reçoit qu'un ticket opaque à usage unique.
    """
    credentials = await resolve_bridge_credentials(db, settings)
    session = await login_guidehub_admin(settings, credentials)
    proxy_web = settings.guides_proxy_web_url.rstrip("/")
    if not proxy_web:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GUIDES_PROXY_WEB_URL requis (proxy nginx :3101 pour guidehub-handoff.html).",
        )
    ticket = await create_guides_handoff_ticket(settings.redis_url, session)
    handoff_url = f"{proxy_web}/guidehub-handoff.html"
    return {
        "handoff_ticket": ticket,
        "expires_in": 120,
        "email": session["email"],
        "role": session["role"],
        "company_id": session["company_id"],
        "company_slug": session["company_slug"],
        "web_url": session["web_url"],
        "proxy_web_url": proxy_web,
        "handoff_url": handoff_url,
        "public_url": session["public_url"],
        "admin_url": f"{proxy_web}/gh/admin" if proxy_web else session["admin_url"],
    }


@router.post("/handoff/consume")
async def guides_handoff_consume(
    payload: GuidesHandoffConsumeRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Échange le ticket opaque contre le JWT GuideHub (une seule fois)."""
    data = await consume_guides_handoff_ticket(settings.redis_url, payload.ticket)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Ticket handoff invalide ou expiré.",
        )
    return {
        "access_token": data["access_token"],
        "email": data.get("email", ""),
        "role": data.get("role", "admin_company"),
        "member_role": data.get("member_role", "Administrateur"),
        "redirect": "/gh/admin",
        "company_slug": data.get("company_slug", ""),
    }


@router.get("/session")
async def guides_session(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    @deprecated Préférer POST /handoff — ne renvoie plus le JWT en clair au navigateur.
    """
    credentials = await resolve_bridge_credentials(db, settings)
    session = await login_guidehub_admin(settings, credentials)
    proxy_web = settings.guides_proxy_web_url.rstrip("/")
    if not proxy_web:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GUIDES_PROXY_WEB_URL requis (proxy nginx :3101 pour guidehub-handoff.html).",
        )
    ticket = await create_guides_handoff_ticket(settings.redis_url, session)
    handoff_url = f"{proxy_web}/guidehub-handoff.html"
    return {
        "handoff_ticket": ticket,
        "expires_in": 120,
        "email": session["email"],
        "role": session["role"],
        "company_id": session["company_id"],
        "company_slug": session["company_slug"],
        "web_url": session["web_url"],
        "proxy_web_url": proxy_web,
        "handoff_url": handoff_url,
        "public_url": session["public_url"],
        "admin_url": f"{proxy_web}/gh/admin" if proxy_web else session["admin_url"],
    }

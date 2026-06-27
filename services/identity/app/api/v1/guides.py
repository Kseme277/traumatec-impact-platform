from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.services.guides_bridge import login_guidehub_admin
from app.services.guides_handoff import (
    consume_guides_handoff_ticket,
    create_guides_handoff_ticket,
)

router = APIRouter()


class GuidesHandoffConsumeRequest(BaseModel):
    ticket: str = Field(min_length=16, max_length=128)


@router.post("/handoff")
async def guides_handoff_prepare(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Prépare un handoff GuideHub sécurisé : le JWT reste côté serveur (Redis, TTL 2 min).
    Le frontend ne reçoit qu'un ticket opaque à usage unique.
    """
    session = await login_guidehub_admin(settings)
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
        "admin_url": session["admin_url"],
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
        "redirect": data.get("redirect", "/admin"),
        "company_slug": data.get("company_slug", ""),
    }


@router.get("/session")
async def guides_session(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    @deprecated Préférer POST /handoff — ne renvoie plus le JWT en clair au navigateur.
    """
    session = await login_guidehub_admin(settings)
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
        "admin_url": session["admin_url"],
    }

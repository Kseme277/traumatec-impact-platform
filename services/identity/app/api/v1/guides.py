from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.services.guides_bridge import login_guidehub_admin

router = APIRouter()


@router.get("/session")
async def guides_session(
    _: Utilisateur = Depends(require_admin),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Session admin GuideHub pour un administrateur TIP.
    Appelle l'API auth JWT existante de GuideHub (aucune modification côté evens).
    """
    session = await login_guidehub_admin(settings)
    proxy_web = settings.guides_proxy_web_url.rstrip("/")
    if not proxy_web:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GUIDES_PROXY_WEB_URL requis (proxy nginx :3101 pour guidehub-handoff.html).",
        )
    handoff_url = f"{proxy_web}/guidehub-handoff.html"
    return {
        "access_token": session["access_token"],
        "expires_in": session["expires_in"],
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

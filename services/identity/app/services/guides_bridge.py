"""Pont TIP → GuideHub (auth JWT entreprise, sans modifier GuideHub)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import Settings

logger = logging.getLogger(__name__)


async def login_guidehub_admin(settings: Settings) -> dict[str, Any]:
    """Authentifie le compte admin entreprise GuideHub via l'API existante."""
    if not settings.guides_bridge_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Liaison GuideHub non configurée (GUIDES_BRIDGE_ENABLED).",
        )

    api_base = settings.guides_api_url.rstrip("/")
    email = settings.guides_bridge_email.strip().lower()
    password = settings.guides_bridge_password

    if not api_base or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GUIDES_API_URL, GUIDES_BRIDGE_EMAIL et GUIDES_BRIDGE_PASSWORD requis.",
        )

    login_url = f"{api_base}/api/v1/auth/login"
    payload = {
        "email": email,
        "password": password,
        "role": "admin_company",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(login_url, json=payload)
    except httpx.RequestError as exc:
        logger.warning("GuideHub login unreachable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="API GuideHub indisponible. Vérifiez GUIDES_API_URL (gateway :3080).",
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        content_type = response.headers.get("content-type", "")
        snippet = (response.text or "")[:180].replace("\n", " ").strip()
        logger.warning(
            "GuideHub login non-JSON: status=%s ctype=%s url=%s body=%s",
            response.status_code,
            content_type,
            login_url,
            snippet,
        )
        if response.status_code in (502, 503, 504) or "text/html" in content_type:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="API GuideHub indisponible. Réessayez dans quelques instants.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Réponse GuideHub invalide (JSON attendu).",
        ) from exc

    if response.status_code >= 400 or not body.get("success"):
        message = (
            (body.get("error") or {}).get("message")
            if isinstance(body.get("error"), dict)
            else None
        ) or "Échec de connexion GuideHub."
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message,
        )

    data = body.get("data") or {}
    access_token = data.get("accessToken")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Jeton GuideHub manquant dans la réponse.",
        )

    user = data.get("user") or {}
    proxy_base = settings.guides_proxy_web_url.rstrip("/")
    web_base = settings.guides_web_url.rstrip("/") or proxy_base
    admin_url = f"{proxy_base}/gh/admin" if proxy_base else f"{web_base}/admin"

    return {
        "access_token": access_token,
        "expires_in": data.get("expiresIn", "2h"),
        "email": user.get("email") or email,
        "role": user.get("role") or "admin_company",
        "member_role": user.get("memberRole") or user.get("member_role") or "Administrateur",
        "company_id": user.get("companyId"),
        "company_slug": settings.guides_company_slug,
        "web_url": proxy_base or web_base,
        "public_url": f"{web_base}/{settings.guides_company_slug}",
        "admin_url": admin_url,
    }

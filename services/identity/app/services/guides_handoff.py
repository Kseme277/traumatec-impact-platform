"""Jetons de handoff GuideHub à usage unique — évite de transporter le JWT dans l'URL ou le localStorage TIP."""

from __future__ import annotations

import secrets
from typing import Any

from fastapi import HTTPException, status

from tip_common.redis_cache import _get_client

HANDOFF_PREFIX = "tip:guides:handoff:"
HANDOFF_TTL_SECONDS = 120


def _handoff_key(ticket: str) -> str:
    return f"{HANDOFF_PREFIX}{ticket}"


async def create_guides_handoff_ticket(redis_url: str, session: dict[str, Any]) -> str:
    ticket = secrets.token_urlsafe(32)
    client = _get_client(redis_url)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Handoff GuideHub indisponible (Redis requis).",
        )
    payload = {
        "access_token": session["access_token"],
        "email": session.get("email", ""),
        "role": session.get("role", "admin_company"),
        "member_role": session.get("member_role", "Administrateur"),
        "company_slug": session.get("company_slug", ""),
        "redirect": "/gh/admin",
    }
    import asyncio
    import json

    await asyncio.to_thread(
        client.setex,
        _handoff_key(ticket),
        HANDOFF_TTL_SECONDS,
        json.dumps(payload, default=str),
    )
    return ticket


async def consume_guides_handoff_ticket(redis_url: str, ticket: str) -> dict[str, Any] | None:
    normalized = (ticket or "").strip()
    if not normalized or len(normalized) > 128:
        return None
    client = _get_client(redis_url)
    if client is None:
        return None
    import asyncio
    import json

    key = _handoff_key(normalized)
    raw = await asyncio.to_thread(client.get, key)
    if not raw:
        return None
    await asyncio.to_thread(client.delete, key)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or not data.get("access_token"):
        return None
    return data

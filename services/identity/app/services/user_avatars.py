"""Résolution des photos de profil Clerk pour la liste utilisateurs."""

from __future__ import annotations

import asyncio

from app.core.config import Settings
from app.models.utilisateur import Utilisateur
from app.services.clerk_client import ClerkClient


async def resolve_avatar_url(settings: Settings, clerk_id: str | None) -> str | None:
    if not clerk_id or not settings.clerk_secret_key:
        return None
    clerk = ClerkClient(settings)
    return await clerk.get_user_image_url(clerk_id)


async def resolve_avatar_map(settings: Settings, users: list[Utilisateur]) -> dict[int, str | None]:
    if not settings.clerk_secret_key or not users:
        return {}

    async def one(user: Utilisateur) -> tuple[int, str | None]:
        if not user.clerk_id:
            return user.id, None
        url = await resolve_avatar_url(settings, user.clerk_id)
        return user.id, url

    pairs = await asyncio.gather(*(one(user) for user in users))
    return dict(pairs)

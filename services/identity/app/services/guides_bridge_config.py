"""Configuration modifiable de la liaison TIP → GuideHub."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.services.system_settings import (
    GUIDES_BRIDGE_EMAIL_KEY,
    GUIDES_BRIDGE_PASSWORD_KEY,
    GUIDES_COMPANY_SLUG_KEY,
    get_setting,
    set_setting,
)


@dataclass(frozen=True)
class GuidesBridgeCredentials:
    company_slug: str
    email: str
    password: str

    @classmethod
    def from_settings(cls, settings: Settings) -> GuidesBridgeCredentials:
        return cls(
            company_slug=settings.guides_company_slug.strip(),
            email=settings.guides_bridge_email.strip().lower(),
            password=settings.guides_bridge_password,
        )


async def resolve_bridge_credentials(
    session: AsyncSession,
    settings: Settings,
) -> GuidesBridgeCredentials:
    db_slug = await get_setting(session, GUIDES_COMPANY_SLUG_KEY)
    db_email = await get_setting(session, GUIDES_BRIDGE_EMAIL_KEY)
    db_password = await get_setting(session, GUIDES_BRIDGE_PASSWORD_KEY)

    env = GuidesBridgeCredentials.from_settings(settings)
    return GuidesBridgeCredentials(
        company_slug=(db_slug or env.company_slug).strip(),
        email=(db_email or env.email).strip().lower(),
        password=db_password if db_password is not None else env.password,
    )


async def get_bridge_config_view(session: AsyncSession, settings: Settings) -> dict:
    credentials = await resolve_bridge_credentials(session, settings)
    db_slug = await get_setting(session, GUIDES_COMPANY_SLUG_KEY)
    db_email = await get_setting(session, GUIDES_BRIDGE_EMAIL_KEY)
    db_password = await get_setting(session, GUIDES_BRIDGE_PASSWORD_KEY)
    configured_in_database = any(value is not None for value in (db_slug, db_email, db_password))

    return {
        "enabled": settings.guides_bridge_enabled,
        "company_slug": credentials.company_slug,
        "bridge_email": credentials.email,
        "password_configured": bool(credentials.password),
        "configured_in_database": configured_in_database,
        "api_url": settings.guides_api_url.rstrip("/"),
        "web_url": settings.guides_web_url.rstrip("/"),
        "proxy_web_url": settings.guides_proxy_web_url.rstrip("/"),
    }


async def update_bridge_config(
    session: AsyncSession,
    settings: Settings,
    *,
    company_slug: str,
    bridge_email: str,
    password: str | None,
) -> dict:
    slug = company_slug.strip()
    email = bridge_email.strip().lower()
    if not slug or not email:
        raise ValueError("Slug entreprise et e-mail requis.")

    await set_setting(session, GUIDES_COMPANY_SLUG_KEY, slug)
    await set_setting(session, GUIDES_BRIDGE_EMAIL_KEY, email)
    if password is not None and password.strip():
        await set_setting(session, GUIDES_BRIDGE_PASSWORD_KEY, password)
    await session.commit()
    return await get_bridge_config_view(session, settings)

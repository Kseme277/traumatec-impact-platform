"""Paramètres globaux identity (schéma identity.system_settings)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

GUIDES_COMPANY_SLUG_KEY = "guides_company_slug"
GUIDES_BRIDGE_EMAIL_KEY = "guides_bridge_email"
GUIDES_BRIDGE_PASSWORD_KEY = "guides_bridge_password"


async def ensure_system_settings_table(session: AsyncSession) -> None:
    await session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS identity.system_settings (
                key         VARCHAR(128) PRIMARY KEY,
                value       TEXT NOT NULL,
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )


async def get_setting(session: AsyncSession, key: str) -> str | None:
    await ensure_system_settings_table(session)
    row = await session.execute(
        text("SELECT value FROM identity.system_settings WHERE key = :key"),
        {"key": key},
    )
    value = row.scalar_one_or_none()
    if value is None:
        return None
    return str(value)


async def set_setting(session: AsyncSession, key: str, value: str) -> None:
    await ensure_system_settings_table(session)
    await session.execute(
        text(
            """
            INSERT INTO identity.system_settings (key, value, updated_at)
            VALUES (:key, :value, now())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = now()
            """
        ),
        {"key": key, "value": value},
    )

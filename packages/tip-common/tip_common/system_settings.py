"""Lecture / écriture des paramètres globaux (catalog.system_settings)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

GC_ENABLED_KEY = "storage_gc_enabled"
GC_RETENTION_DAYS_KEY = "storage_gc_retention_days"
GC_LAST_RUN_AT_KEY = "storage_gc_last_run_at"
GC_LAST_STATS_KEY = "storage_gc_last_stats"

DEFAULT_GC_ENABLED = True
DEFAULT_GC_RETENTION_DAYS = 14


async def ensure_system_settings_table(session: AsyncSession) -> None:
    await session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS catalog.system_settings (
                key         VARCHAR(128) PRIMARY KEY,
                value       TEXT NOT NULL,
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    await session.execute(
        text(
            """
            INSERT INTO catalog.system_settings (key, value) VALUES
                ('zip_name_pattern', '{project_number}_{event_name}_{city}_{country}_{date}'),
                (:enabled_key, :enabled_val),
                (:days_key, :days_val)
            ON CONFLICT (key) DO NOTHING
            """
        ),
        {
            "enabled_key": GC_ENABLED_KEY,
            "enabled_val": "true" if DEFAULT_GC_ENABLED else "false",
            "days_key": GC_RETENTION_DAYS_KEY,
            "days_val": str(DEFAULT_GC_RETENTION_DAYS),
        },
    )


async def get_setting(session: AsyncSession, key: str, default: str | None = None) -> str | None:
    row = await session.execute(
        text("SELECT value FROM catalog.system_settings WHERE key = :key"),
        {"key": key},
    )
    value = row.scalar_one_or_none()
    if value is None:
        return default
    return str(value)


async def set_setting(session: AsyncSession, key: str, value: str) -> None:
    await session.execute(
        text(
            """
            INSERT INTO catalog.system_settings (key, value, updated_at)
            VALUES (:key, :value, now())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = now()
            """
        ),
        {"key": key, "value": value},
    )


async def get_gc_settings(session: AsyncSession) -> dict[str, str | int | bool | None]:
    await ensure_system_settings_table(session)
    enabled_raw = await get_setting(session, GC_ENABLED_KEY, "true")
    days_raw = await get_setting(session, GC_RETENTION_DAYS_KEY, str(DEFAULT_GC_RETENTION_DAYS))
    try:
        retention_days = max(1, min(365, int(days_raw or DEFAULT_GC_RETENTION_DAYS)))
    except ValueError:
        retention_days = DEFAULT_GC_RETENTION_DAYS
    return {
        "enabled": str(enabled_raw).lower() in ("1", "true", "yes", "on"),
        "retention_days": retention_days,
        "last_run_at": await get_setting(session, GC_LAST_RUN_AT_KEY),
        "last_stats": await get_setting(session, GC_LAST_STATS_KEY),
    }

"""Applique les migrations docgen manquantes au démarrage."""

from __future__ import annotations

import logging

from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

_MIGRATIONS = (
    """
    ALTER TABLE docgen.generation_jobs
        ADD COLUMN IF NOT EXISTS logs_json JSONB;
    """,
    """
    ALTER TABLE docgen.generation_jobs
        ADD COLUMN IF NOT EXISTS zip_purged_at TIMESTAMPTZ;
    """,
)


async def apply_pending_migrations() -> None:
    from tip_common.system_settings import ensure_system_settings_table

    async with AsyncSessionLocal() as session:
        for sql in _MIGRATIONS:
            await session.execute(text(sql))
        await ensure_system_settings_table(session)
        await session.commit()
    logger.info("Migrations docgen à jour")

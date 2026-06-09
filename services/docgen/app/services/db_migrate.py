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
)


async def apply_pending_migrations() -> None:
    async with AsyncSessionLocal() as session:
        for sql in _MIGRATIONS:
            await session.execute(text(sql))
        await session.commit()
    logger.info("Migrations docgen à jour")

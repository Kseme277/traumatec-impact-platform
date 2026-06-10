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
    """
    CREATE TABLE IF NOT EXISTS docgen.certificate_generations (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id            UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
        requested_by_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id),
        role_filter         VARCHAR(32) NOT NULL DEFAULT 'all',
        certificate_count   INTEGER NOT NULL DEFAULT 0,
        storage_key         VARCHAR(512) NOT NULL,
        filename            VARCHAR(512) NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_docgen_certificate_generations_event_id
        ON docgen.certificate_generations(event_id, created_at DESC);
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

"""Applique les migrations catalogue manquantes au démarrage."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

_MIGRATIONS = (
    """
    ALTER TABLE catalog.event_profiles
        ADD COLUMN IF NOT EXISTS package_type VARCHAR(32),
        ADD COLUMN IF NOT EXISTS event_type_label VARCHAR(64);
    CREATE INDEX IF NOT EXISTS idx_catalog_event_profiles_package_type
        ON catalog.event_profiles(package_type);
    """,
    """
    CREATE TABLE IF NOT EXISTS catalog.package_bundles (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        package_type        VARCHAR(32) NOT NULL,
        version             INTEGER NOT NULL,
        label               VARCHAR(255) NOT NULL,
        source_zip_name     VARCHAR(512),
        zip_path            VARCHAR(512) NOT NULL,
        file_count          INTEGER NOT NULL DEFAULT 0,
        analysis_json       JSONB,
        is_active           BOOLEAN NOT NULL DEFAULT FALSE,
        uploaded_by_id      INTEGER,
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_package_bundles_type_version UNIQUE (package_type, version)
    );
    CREATE INDEX IF NOT EXISTS idx_package_bundles_type ON catalog.package_bundles(package_type);
    CREATE INDEX IF NOT EXISTS idx_package_bundles_active ON catalog.package_bundles(package_type, is_active);
    ALTER TABLE catalog.event_profiles
        ADD COLUMN IF NOT EXISTS active_bundle_id UUID REFERENCES catalog.package_bundles(id);
    """,
)


async def _table_exists(session: AsyncSession, table: str) -> bool:
    result = await session.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'catalog' AND table_name = :table LIMIT 1"
        ),
        {"table": table},
    )
    return result.scalar_one_or_none() is not None


async def ensure_catalog_schema() -> None:
    try:
        async with AsyncSessionLocal() as session:
            if await _table_exists(session, "package_bundles"):
                col = await session.execute(
                    text(
                        "SELECT 1 FROM information_schema.columns "
                        "WHERE table_schema = 'catalog' AND table_name = 'event_profiles' "
                        "AND column_name = 'package_type' LIMIT 1"
                    )
                )
                if col.scalar_one_or_none() is not None:
                    return

            logger.info("Migration catalogue : application des schémas paquets…")
            for block in _MIGRATIONS:
                for statement in block.strip().split(";"):
                    stmt = statement.strip()
                    if stmt:
                        await session.execute(text(stmt))
            await session.commit()
            logger.info("Migration catalogue terminée.")
    except Exception as exc:
        logger.warning("Migration catalogue ignorée : %s", exc)

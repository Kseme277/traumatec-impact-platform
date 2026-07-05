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
    """
    CREATE TABLE IF NOT EXISTS catalog.package_type_definitions (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code                VARCHAR(32) NOT NULL UNIQUE,
        label               VARCHAR(64) NOT NULL,
        activity_kind       VARCHAR(32) NOT NULL,
        activity_label      VARCHAR(64) NOT NULL,
        title               VARCHAR(255) NOT NULL,
        description         TEXT,
        preparation_theme   VARCHAR(32) NOT NULL DEFAULT 'operatory',
        duration_days       INTEGER NOT NULL DEFAULT 3,
        sort_order          INTEGER NOT NULL DEFAULT 0,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_package_type_definitions_kind
        ON catalog.package_type_definitions(activity_kind);
    """,
    """
    CREATE TABLE IF NOT EXISTS catalog.package_activity_categories (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code                VARCHAR(32) NOT NULL UNIQUE,
        label               VARCHAR(64) NOT NULL,
        sort_order          INTEGER NOT NULL DEFAULT 0,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_package_activity_categories_sort
        ON catalog.package_activity_categories(sort_order);
    """,
)


async def ensure_catalog_schema() -> None:
    try:
        async with AsyncSessionLocal() as session:
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

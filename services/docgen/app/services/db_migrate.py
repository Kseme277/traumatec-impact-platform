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
    """
    ALTER TABLE docgen.certificate_generations
        ADD COLUMN IF NOT EXISTS preview_storage_key VARCHAR(512),
        ADD COLUMN IF NOT EXISTS preview_filename VARCHAR(512);
    """,
    """
    ALTER TABLE docgen.generation_jobs
        ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(32) NOT NULL DEFAULT 'generated',
        ADD COLUMN IF NOT EXISTS assigned_reviewer_id INTEGER REFERENCES identity.utilisateurs(id),
        ADD COLUMN IF NOT EXISTS assigned_validator_id INTEGER REFERENCES identity.utilisateurs(id);
    """,
    """
    UPDATE docgen.generation_jobs
    SET workflow_status = 'approved'
    WHERE status = 'completed' AND workflow_status = 'generated';
    """,
    """
    CREATE TABLE IF NOT EXISTS docgen.package_workflow_steps (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_job_id   UUID NOT NULL REFERENCES docgen.generation_jobs(id) ON DELETE CASCADE,
        step                VARCHAR(64) NOT NULL,
        action              VARCHAR(64) NOT NULL,
        actor_id            INTEGER REFERENCES identity.utilisateurs(id),
        actor_name          VARCHAR(255),
        comment             TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_package_workflow_steps_job
        ON docgen.package_workflow_steps(generation_job_id, created_at);
    """,
    """
    CREATE TABLE IF NOT EXISTS docgen.package_file_reviews (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_job_id   UUID NOT NULL REFERENCES docgen.generation_jobs(id) ON DELETE CASCADE,
        template_id         UUID,
        template_code       VARCHAR(128) NOT NULL,
        file_path           VARCHAR(512),
        status              VARCHAR(32) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
        comment             TEXT,
        reviewed_by_id      INTEGER REFERENCES identity.utilisateurs(id),
        reviewed_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (generation_job_id, template_code)
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_package_file_reviews_job
        ON docgen.package_file_reviews(generation_job_id);
    """,
    """
    ALTER TABLE docgen.generation_jobs
        ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS phase_due_at TIMESTAMPTZ;
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

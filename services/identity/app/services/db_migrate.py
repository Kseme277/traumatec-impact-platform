"""Applique les migrations identity manquantes au démarrage."""

from __future__ import annotations

import logging

from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from tip_common.email_identity import email_local_part

logger = logging.getLogger(__name__)

_MIGRATIONS = (
    """
    ALTER TABLE identity.utilisateurs
        ADD COLUMN IF NOT EXISTS username VARCHAR(64),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
        ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deactivation_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_utilisateurs_username
        ON identity.utilisateurs (username)
        WHERE username IS NOT NULL;
    """,
    """
    CREATE TABLE IF NOT EXISTS identity.user_roles (
        user_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id) ON DELETE CASCADE,
        role        VARCHAR(32) NOT NULL
                    CHECK (role IN ('administrateur', 'support_administratif', 'controle_procedure', 'validateur', 'preparateur')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, role)
    );
    """,
    """
    INSERT INTO identity.user_roles (user_id, role)
    SELECT u.id,
           CASE WHEN u.role = 'preparateur' THEN 'support_administratif' ELSE u.role END
    FROM identity.utilisateurs u
    ON CONFLICT DO NOTHING;
    """,
    """
    ALTER TABLE identity.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
    """,
    """
    ALTER TABLE identity.utilisateurs
        ADD CONSTRAINT utilisateurs_role_check
        CHECK (role IN ('administrateur', 'preparateur', 'support_administratif', 'controle_procedure', 'validateur'));
    """,
    """
    UPDATE identity.utilisateurs SET role = 'support_administratif' WHERE role = 'preparateur';
    """,
    """
    CREATE TABLE IF NOT EXISTS identity.notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id) ON DELETE CASCADE,
        type        VARCHAR(64) NOT NULL,
        title       VARCHAR(255) NOT NULL,
        body        TEXT NOT NULL,
        link        VARCHAR(512),
        payload_json JSONB,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_identity_notifications_user_created
        ON identity.notifications(user_id, created_at DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS identity.system_settings (
        key         VARCHAR(128) PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
)


async def _backfill_usernames(session) -> None:
    result = await session.execute(
        text(
            """
            SELECT id, email, username
            FROM identity.utilisateurs
            WHERE username IS NULL OR username = ''
            """
        )
    )
    rows = result.fetchall()
    used: set[str] = set()
    existing = await session.execute(text("SELECT username FROM identity.utilisateurs WHERE username IS NOT NULL"))
    for row in existing.fetchall():
        if row.username:
            used.add(row.username.lower())

    for row in rows:
        base = email_local_part(row.email) or f"user{row.id}"
        candidate = base
        suffix = 1
        while candidate.lower() in used:
            candidate = f"{base}{suffix}"
            suffix += 1
        used.add(candidate.lower())
        await session.execute(
            text("UPDATE identity.utilisateurs SET username = :username WHERE id = :id"),
            {"username": candidate, "id": row.id},
        )


async def apply_pending_migrations() -> None:
    async with AsyncSessionLocal() as session:
        for sql in _MIGRATIONS:
            await session.execute(text(sql))
        await _backfill_usernames(session)
        await session.commit()
    logger.info("Migrations identity à jour")

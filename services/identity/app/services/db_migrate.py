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

"""Applique les migrations events manquantes au démarrage."""

from __future__ import annotations

import logging

from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

_MIGRATIONS = (
    """
    ALTER TABLE events.participants
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(128),
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(128),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS statut VARCHAR(128),
        ADD COLUMN IF NOT EXISTS certificate_role VARCHAR(32) NOT NULL DEFAULT 'participant',
        ADD COLUMN IF NOT EXISTS registration_meta JSONB,
        ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NOT NULL DEFAULT now();
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_events_participants_certificate_role
        ON events.participants(event_id, certificate_role);
    """,
    """
    ALTER TABLE events.participants
        ADD COLUMN IF NOT EXISTS identity_key VARCHAR(160);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_events_participants_identity_key
        ON events.participants(identity_key)
        WHERE identity_key IS NOT NULL AND identity_key <> '';
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_events_participants_event_identity
        ON events.participants(event_id, identity_key)
        WHERE identity_key IS NOT NULL AND identity_key <> '';
    """,
)


async def _backfill_participant_identity_keys(session) -> None:
    from sqlalchemy import select

    from app.models.participant import Participant
    from tip_common.participant_identity import participant_identity_key

    result = await session.execute(
        select(Participant).where(
            (Participant.identity_key.is_(None)) | (Participant.identity_key == "")
        )
    )
    participants = list(result.scalars().all())
    if not participants:
        return

    for participant in participants:
        participant.identity_key = participant_identity_key(
            email=participant.email,
            last_name=participant.last_name,
            first_name=participant.first_name,
            full_name=participant.full_name,
        )

    seen: set[tuple] = set()
    duplicates: list = []
    for participant in participants:
        key = (participant.event_id, participant.identity_key)
        if key in seen:
            duplicates.append(participant)
        else:
            seen.add(key)

    for duplicate in duplicates:
        await session.delete(duplicate)

    if participants or duplicates:
        logger.info(
            "Backfill identity_key : %s mis à jour, %s doublon(s) supprimé(s)",
            len(participants) - len(duplicates),
            len(duplicates),
        )


async def apply_pending_migrations() -> None:
    async with AsyncSessionLocal() as session:
        for sql in _MIGRATIONS:
            await session.execute(text(sql))
        await _backfill_participant_identity_keys(session)
        await session.commit()
    logger.info("Migrations events à jour")

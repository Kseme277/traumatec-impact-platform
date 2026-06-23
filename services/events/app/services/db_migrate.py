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
    """
    ALTER TABLE events.events
        ADD COLUMN IF NOT EXISTS national_responsible_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS national_responsible_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS national_responsible_phone VARCHAR(32),
        ADD COLUMN IF NOT EXISTS organizer_responsible_user_id INTEGER REFERENCES identity.utilisateurs(id);
    """,
    """
    CREATE TABLE IF NOT EXISTS events.teachers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        last_name   VARCHAR(128) NOT NULL,
        first_name  VARCHAR(128) NOT NULL,
        email       VARCHAR(255),
        phone       VARCHAR(32),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS events.event_teachers (
        event_id    UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
        teacher_id  UUID NOT NULL REFERENCES events.teachers(id) ON DELETE CASCADE,
        PRIMARY KEY (event_id, teacher_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS events.national_contacts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name   VARCHAR(255) NOT NULL,
        email       VARCHAR(255),
        phone       VARCHAR(32),
        country     VARCHAR(128),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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


async def _backfill_national_contacts(session) -> None:
    from sqlalchemy import select

    from app.models.event import Event
    from app.models.national_contact import NationalContact

    result = await session.execute(
        select(Event.responsible_person, Event.country, Event.metadata_json).where(
            Event.responsible_person.isnot(None),
            Event.responsible_person != "",
        )
    )
    seen: set[str] = set()
    existing = await session.execute(select(NationalContact.full_name))
    for (name,) in existing.fetchall():
        seen.add(name.strip().lower())

    created = 0
    for row in result.fetchall():
        name = (row.responsible_person or "").strip()
        if not name or name.lower() in seen:
            continue
        meta = row.metadata_json or {}
        email = meta.get("responsible_email") if isinstance(meta, dict) else None
        phone = meta.get("responsible_phone") if isinstance(meta, dict) else None
        session.add(
            NationalContact(
                full_name=name,
                email=str(email).strip() if email else None,
                phone=str(phone).strip() if phone else None,
                country=row.country,
            )
        )
        seen.add(name.lower())
        created += 1

    if created:
        logger.info("Backfill national_contacts : %s contact(s) créé(s)", created)


async def apply_pending_migrations() -> None:
    async with AsyncSessionLocal() as session:
        for sql in _MIGRATIONS:
            await session.execute(text(sql))
        await _backfill_participant_identity_keys(session)
        await _backfill_national_contacts(session)
        await session.commit()
    logger.info("Migrations events à jour")

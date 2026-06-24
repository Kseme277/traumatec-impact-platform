from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.participant import Participant
from app.models.teacher import EventTeacher, Teacher

_PHONE_META_KEYS = (
    "phone",
    "telephone",
    "téléphone",
    "tel",
    "mobile",
    "gsm",
    "portable",
    "numero_telephone",
    "numero_de_telephone",
    "numéro_téléphone",
    "numero_tel",
    "contact_phone",
)


def _extract_phone(*sources: dict[str, Any] | None) -> str | None:
    for src in sources:
        if not isinstance(src, dict):
            continue
        for key in _PHONE_META_KEYS:
            value = src.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()[:32]
        for key, value in src.items():
            key_norm = str(key).lower()
            if any(term in key_norm for term in ("tel", "phone", "mobile", "gsm", "portable")):
                if value is not None and str(value).strip():
                    return str(value).strip()[:32]
    return None


def _split_names(
    *,
    full_name: str | None,
    first_name: str | None,
    last_name: str | None,
) -> tuple[str, str]:
    first = (first_name or "").strip()
    last = (last_name or "").strip()
    if first or last:
        return first or "—", last or "—"
    full = (full_name or "").strip()
    if not full:
        return "—", "—"
    parts = full.split()
    if len(parts) >= 2:
        return parts[0], " ".join(parts[1:])
    return full, "—"


async def find_or_create_teacher(
    db: AsyncSession,
    *,
    first_name: str,
    last_name: str,
    email: str | None,
    phone: str | None = None,
) -> tuple[Teacher, bool]:
    first = (first_name or "—").strip()[:128]
    last = (last_name or "—").strip()[:128]
    email_norm = email.strip().lower() if email and email.strip() else None
    phone_norm = phone.strip()[:32] if phone and phone.strip() else None

    if email_norm:
        result = await db.execute(
            select(Teacher).where(func.lower(Teacher.email) == email_norm).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            if phone_norm and not existing.phone:
                existing.phone = phone_norm
            return existing, False

    result = await db.execute(
        select(Teacher).where(
            func.lower(Teacher.first_name) == first.lower(),
            func.lower(Teacher.last_name) == last.lower(),
        ).limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        if email_norm and not existing.email:
            existing.email = email_norm
        if phone_norm and not existing.phone:
            existing.phone = phone_norm
        return existing, False

    teacher = Teacher(
        first_name=first,
        last_name=last,
        email=email_norm,
        phone=phone_norm,
        is_active=True,
    )
    db.add(teacher)
    await db.flush()
    return teacher, True


async def link_teacher_to_event(db: AsyncSession, event_id: UUID, teacher_id: UUID) -> bool:
    result = await db.execute(
        select(EventTeacher).where(
            EventTeacher.event_id == event_id,
            EventTeacher.teacher_id == teacher_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        return False
    db.add(EventTeacher(event_id=event_id, teacher_id=teacher_id))
    return True


async def sync_teacher_from_participant_data(
    db: AsyncSession,
    event_id: UUID,
    *,
    full_name: str | None,
    first_name: str | None,
    last_name: str | None,
    email: str | None,
    phone: str | None = None,
) -> tuple[bool, bool]:
    """Returns (teacher_created, event_link_created)."""
    first, last = _split_names(
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
    )
    teacher, created = await find_or_create_teacher(
        db,
        first_name=first,
        last_name=last,
        email=email,
        phone=phone,
    )
    linked = await link_teacher_to_event(db, event_id, teacher.id)
    return created, linked


async def sync_teacher_from_participant(db: AsyncSession, participant: Participant) -> tuple[bool, bool]:
    phone = _extract_phone(participant.registration_meta)
    return await sync_teacher_from_participant_data(
        db,
        participant.event_id,
        full_name=participant.full_name,
        first_name=participant.first_name,
        last_name=participant.last_name,
        email=participant.email,
        phone=phone,
    )


async def sync_teacher_from_import_row(db: AsyncSession, event_id: UUID, row: dict[str, Any]) -> tuple[bool, bool]:
    phone = row.get("phone") or _extract_phone(row.get("registration_meta"))
    return await sync_teacher_from_participant_data(
        db,
        event_id,
        full_name=row.get("full_name"),
        first_name=row.get("first_name"),
        last_name=row.get("last_name"),
        email=row.get("email"),
        phone=phone,
    )


async def sync_all_enseignants_from_participants(db: AsyncSession) -> dict[str, int]:
    result = await db.execute(
        select(Participant)
        .where(Participant.certificate_role == "enseignant")
        .order_by(Participant.imported_at.asc())
    )
    participants = list(result.scalars().all())
    teachers_created = 0
    event_links_created = 0
    for participant in participants:
        created, linked = await sync_teacher_from_participant(db, participant)
        if created:
            teachers_created += 1
        if linked:
            event_links_created += 1
    return {
        "processed": len(participants),
        "teachers_created": teachers_created,
        "event_links_created": event_links_created,
    }

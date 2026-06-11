import math
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.event import Event
from app.models.participant import Participant
from app.schemas.participant import (
    ParticipantDetailResponse,
    ParticipantEventHistoryItem,
    ParticipantImportResult,
    ParticipantListResponse,
    ParticipantResponse,
    ParticipantStatsResponse,
)
from app.services.participant_import import REGISTRATION_COLUMNS_HELP, parse_registration_workbook
from tip_common.audit import record_audit_event
from tip_common.participant_identity import dedupe_participant_records, participant_identity_key
from tip_common.redis_cache import invalidate_prefix
from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


async def _invalidate_participant_cache() -> None:
    settings = get_settings()
    if settings.cache_enabled:
        await invalidate_prefix(settings.redis_url, "tip:events:participants:")


def _participant_search_filter(query: str):
    pattern = f"%{query.strip().lower()}%"
    return or_(
        func.lower(Participant.full_name).like(pattern),
        func.lower(func.coalesce(Participant.email, "")).like(pattern),
        func.lower(func.coalesce(Participant.hospital, "")).like(pattern),
        func.lower(func.coalesce(Participant.last_name, "")).like(pattern),
        func.lower(func.coalesce(Participant.first_name, "")).like(pattern),
    )


@router.get("/events/{event_id}", response_model=ParticipantListResponse)
async def list_participants(
    event_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    q: str | None = Query(None, max_length=200),
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ParticipantListResponse:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    filters = [Participant.event_id == event_id]
    if q and q.strip():
        filters.append(_participant_search_filter(q))

    total = (
        await db.execute(select(func.count()).select_from(Participant).where(*filters))
    ).scalar_one()

    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    safe_page = min(page, total_pages)
    offset = (safe_page - 1) * page_size

    result = await db.execute(
        select(Participant)
        .where(*filters)
        .order_by(Participant.full_name.asc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    return ParticipantListResponse(
        items=[ParticipantResponse.model_validate(p, from_attributes=True) for p in items],
        total=total,
        page=safe_page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/events/{event_id}/stats", response_model=ParticipantStatsResponse)
async def participant_stats(
    event_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ParticipantStatsResponse:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    total = (
        await db.execute(
            select(func.count()).select_from(Participant).where(Participant.event_id == event_id)
        )
    ).scalar_one()
    participants_count = (
        await db.execute(
            select(func.count())
            .select_from(Participant)
            .where(Participant.event_id == event_id, Participant.certificate_role == "participant")
        )
    ).scalar_one()
    enseignants_count = (
        await db.execute(
            select(func.count())
            .select_from(Participant)
            .where(Participant.event_id == event_id, Participant.certificate_role == "enseignant")
        )
    ).scalar_one()
    with_email = (
        await db.execute(
            select(func.count())
            .select_from(Participant)
            .where(
                Participant.event_id == event_id,
                Participant.email.is_not(None),
                Participant.email != "",
            )
        )
    ).scalar_one()
    last_imported = (
        await db.execute(
            select(func.max(Participant.imported_at)).where(Participant.event_id == event_id)
        )
    ).scalar_one()

    source_title = None
    certificate_title = None
    if event.certificate_context_json and isinstance(event.certificate_context_json, dict):
        source_title = event.certificate_context_json.get("source_event_title")
        certificate_title = event.certificate_context_json.get("title_formatted")

    return ParticipantStatsResponse(
        total=total,
        participants=participants_count,
        enseignants=enseignants_count,
        with_email=with_email,
        last_imported_at=last_imported,
        source_event_title=source_title,
        certificate_title_formatted=certificate_title,
    )


@router.get("/{participant_id}", response_model=ParticipantDetailResponse)
async def get_participant_detail(
    participant_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ParticipantDetailResponse:
    participant = await db.get(Participant, participant_id)
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant introuvable")

    identity_key = participant.identity_key or participant_identity_key(
        email=participant.email,
        last_name=participant.last_name,
        first_name=participant.first_name,
        full_name=participant.full_name,
    )

    history_result = await db.execute(
        select(Participant, Event)
        .join(Event, Event.id == Participant.event_id)
        .where(Participant.identity_key == identity_key)
        .order_by(Event.start_date.desc().nullslast(), Participant.full_name.asc())
    )
    history_rows = history_result.all()

    events = [
        ParticipantEventHistoryItem(
            event_id=event.id,
            participant_id=row_participant.id,
            project_number=event.project_number,
            title=event.title,
            start_date=event.start_date,
            end_date=event.end_date,
            city=event.city,
            country=event.country,
            certificate_role=row_participant.certificate_role,
        )
        for row_participant, event in history_rows
    ]

    return ParticipantDetailResponse(
        participant=ParticipantResponse.model_validate(participant, from_attributes=True),
        events_participated_count=len(events),
        events=events,
    )


@router.post("/events/{event_id}/import", response_model=ParticipantImportResult)
async def import_participants(
    event_id: UUID,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ParticipantImportResult:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format Excel (.xlsx) requis. {REGISTRATION_COLUMNS_HELP}",
        )

    content = await file.read()
    try:
        parsed_rows, warnings, source_event_title = parse_registration_workbook(
            content,
            expected_event={
                "title": event.title,
                "project_number": event.project_number,
                "start_date": event.start_date,
                "end_date": event.end_date,
                "city": event.city,
                "country": event.country,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    rows, duplicate_in_file_count = dedupe_participant_records(parsed_rows)
    identity_keys = [row["identity_key"] for row in rows]

    known_from_other_events_count = 0
    if identity_keys:
        known_from_other_events_count = (
            await db.execute(
                select(func.count(func.distinct(Participant.identity_key))).where(
                    Participant.identity_key.in_(identity_keys),
                    Participant.event_id != event_id,
                )
            )
        ).scalar_one()

    existing_result = await db.execute(
        select(Participant.identity_key).where(Participant.event_id == event_id)
    )
    existing_in_event_keys = {key for key in existing_result.scalars().all() if key}

    enseignants = 0
    participants_count = 0
    already_in_event_count = 0
    imported = 0

    for row in rows:
        if row["identity_key"] in existing_in_event_keys:
            already_in_event_count += 1
            continue

        if row["certificate_role"] == "enseignant":
            enseignants += 1
        else:
            participants_count += 1
        db.add(
            Participant(
                event_id=event_id,
                full_name=row["full_name"],
                last_name=row.get("last_name"),
                first_name=row.get("first_name"),
                hospital=row.get("hospital"),
                email=row.get("email"),
                statut=row.get("statut"),
                certificate_role=row["certificate_role"],
                identity_key=row["identity_key"],
                row_number=row.get("row_number"),
                registration_meta=row.get("registration_meta") or None,
            )
        )
        imported += 1
        existing_in_event_keys.add(row["identity_key"])

    if duplicate_in_file_count > 0:
        warnings.append(
            f"{duplicate_in_file_count} doublon(s) ignoré(s) dans le fichier (même e-mail ou même nom)."
        )
    if already_in_event_count > 0:
        warnings.append(
            f"{already_in_event_count} participant(s) déjà inscrit(s) à cet événement — ignoré(s)."
        )
    if known_from_other_events_count > 0:
        warnings.append(
            f"{known_from_other_events_count} participant(s) déjà présent(s) sur d'autres événements "
            "(historique conservé pour le détail participant)."
        )

    ctx = dict(event.certificate_context_json or {})
    ctx["source_event_title"] = source_event_title
    ctx["title_formatted"] = None
    ctx["last_import_filename"] = file.filename
    event.certificate_context_json = ctx
    total_in_event = (
        await db.execute(
            select(func.count()).select_from(Participant).where(Participant.event_id == event_id)
        )
    ).scalar_one()
    event.participants_real = total_in_event

    await record_audit_event(
        db,
        actor_id=user.id,
        action="participant.import",
        entity_type="event",
        entity_id=str(event_id),
        payload={
            "count": imported,
            "duplicate_in_file_count": duplicate_in_file_count,
            "already_in_event_count": already_in_event_count,
            "known_from_other_events_count": known_from_other_events_count,
            "filename": file.filename,
            "actor_name": f"{user.prenom} {user.nom}".strip(),
            "enseignants_count": enseignants,
            "participants_count": participants_count,
            "total_in_event": total_in_event,
        },
    )
    await db.commit()
    await _invalidate_participant_cache()

    return ParticipantImportResult(
        imported_count=imported,
        skipped_count=duplicate_in_file_count + already_in_event_count,
        duplicate_in_file_count=duplicate_in_file_count,
        already_in_event_count=already_in_event_count,
        known_from_other_events_count=known_from_other_events_count,
        enseignants_count=enseignants,
        participants_count=participants_count,
        source_event_title=source_event_title,
        warnings=warnings,
    )

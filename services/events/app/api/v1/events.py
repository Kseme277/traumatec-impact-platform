from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.project_status import (
    normalize_project_status,
    project_status_filter_values,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.models.event import Event
from app.models.teacher import EventTeacher, Teacher
from app.schemas.event import (
    DashboardFinancialStats,
    DashboardParticipantsStats,
    DashboardStatsResponse,
    EventCreate,
    EventListResponse,
    EventResponse,
    EventUpdate,
    InferredEventPackage,
)
from app.schemas.teacher import TeacherResponse
from tip_common.audit import record_audit_event
from tip_common.package_types import describe_inferred_event_package
from tip_common.redis_cache import cached_call, invalidate_prefix
from tip_common.security import AuthenticatedUser, get_current_user, require_admin
from tip_common.event_rules import (
    assert_event_dates_editable,
    filter_update_payload_for_role,
    get_event_workflow_status,
    validate_event_dates,
)

router = APIRouter()


async def _invalidate_events_cache() -> None:
    settings = get_settings()
    if not settings.cache_enabled:
        return
    await invalidate_prefix(settings.redis_url, "tip:events:")
    await invalidate_prefix(settings.redis_url, "tip:analytics:")


def _event_payload_for_classify(event: Event) -> dict:
    return {
        "preparation_theme": event.preparation_theme,
        "event_type": event.event_type,
        "title": event.title,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "metadata_json": event.metadata_json,
    }


def _event_to_response(event: Event, teachers: list[Teacher] | None = None) -> EventResponse:
    response = EventResponse.model_validate(event)
    teacher_items = [TeacherResponse.model_validate(t) for t in (teachers or [])]
    inferred = describe_inferred_event_package(**_event_payload_for_classify(event))
    if inferred:
        return response.model_copy(
            update={
                "inferred_package": InferredEventPackage.model_validate(inferred),
                "teachers": teacher_items,
            },
        )
    return response.model_copy(update={"teachers": teacher_items})


async def _load_event_teachers(db: AsyncSession, event_id: UUID) -> list[Teacher]:
    result = await db.execute(
        select(Teacher)
        .join(EventTeacher, EventTeacher.teacher_id == Teacher.id)
        .where(EventTeacher.event_id == event_id)
        .order_by(Teacher.last_name, Teacher.first_name)
    )
    return list(result.scalars().all())


async def _sync_event_teachers(db: AsyncSession, event_id: UUID, teacher_ids: list[UUID]) -> None:
    await db.execute(delete(EventTeacher).where(EventTeacher.event_id == event_id))
    for teacher_id in teacher_ids:
        teacher = await db.get(Teacher, teacher_id)
        if teacher is None or not teacher.is_active:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Enseignant introuvable ou inactif : {teacher_id}",
            )
        db.add(EventTeacher(event_id=event_id, teacher_id=teacher_id))


async def _event_to_response_async(event: Event, db: AsyncSession) -> EventResponse:
    """Inférence enrichie (NVIDIA si clé API) pour la fiche événement."""
    from tip_common.nvidia_event_classifier import classify_event_package

    teachers = await _load_event_teachers(db, event.id)
    response = EventResponse.model_validate(event)
    teacher_items = [TeacherResponse.model_validate(t) for t in teachers]
    inferred = await classify_event_package(_event_payload_for_classify(event))
    if inferred:
        return response.model_copy(
            update={
                "inferred_package": InferredEventPackage.model_validate(inferred),
                "teachers": teacher_items,
            },
        )
    return response.model_copy(update={"teachers": teacher_items})


def _event_overlaps_year(start: date, end: date, year: int) -> bool:
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)
    return start <= year_end and end >= year_start


def _to_float(value: Decimal | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def _chart_label(value: str | None, default: str) -> str:
    if value is None:
        return default
    label = str(value).strip()
    if not label or label.lower() in {"nan", "none", "null", "undefined"}:
        return default
    return label


def _top_region_counts(by_region: dict[str, int], limit: int = 12) -> dict[str, int]:
    sorted_items = sorted(by_region.items(), key=lambda item: item[1], reverse=True)
    return dict(sorted_items[:limit])


def _apply_update(event: Event, payload: EventUpdate) -> None:
    data = payload.model_dump(exclude_unset=True)
    data.pop("teacher_ids", None)
    contact_patch: dict[str, str] = {}
    for contact_key in ("responsible_email", "responsible_phone"):
        if contact_key in data:
            value = data.pop(contact_key)
            if value is not None:
                contact_patch[contact_key] = str(value).strip()
    if contact_patch:
        meta = dict(event.metadata_json or {})
        meta.update(contact_patch)
        event.metadata_json = meta
    if "package_type_override" in data:
        override = data.pop("package_type_override")
        meta = dict(event.metadata_json or {})
        if override:
            meta["package_type_override"] = str(override).strip().upper().replace("-", "_")
        else:
            meta.pop("package_type_override", None)
        event.metadata_json = meta
    for key, value in data.items():
        setattr(event, key, value)

    if any(
        key in data
        for key in ("national_responsible_email", "national_responsible_phone", "national_responsible_name")
    ):
        meta = dict(event.metadata_json or {})
        if event.national_responsible_email:
            meta["responsible_email"] = event.national_responsible_email
        if event.national_responsible_phone:
            meta["responsible_phone"] = event.national_responsible_phone
        event.metadata_json = meta


_EVENT_SORT_COLUMNS = {
    "start_date": Event.start_date,
    "title": Event.title,
    "project_number": Event.project_number,
    "country": Event.country,
    "city": Event.city,
    "amount_chf": Event.amount_chf,
    "project_status": Event.project_status,
    "responsible_person": Event.responsible_person,
    "created_at": Event.created_at,
}


def _apply_event_sort(query, sort_by: str | None, sort_dir: str | None):
    column = _EVENT_SORT_COLUMNS.get((sort_by or "start_date").strip(), Event.start_date)
    direction = (sort_dir or "desc").strip().lower()
    if direction == "asc":
        return query.order_by(column.asc().nullslast(), Event.created_at.desc())
    return query.order_by(column.desc().nullslast(), Event.created_at.desc())


async def _list_events_impl(
    db: AsyncSession,
    *,
    q: str | None,
    status_filter: str | None,
    project_status: str | None,
    event_type: str | None,
    country: str | None,
    sort_by: str | None,
    sort_dir: str | None,
    upcoming: bool | None,
) -> EventListResponse:
    query = _apply_event_sort(select(Event), sort_by, sort_dir)
    count_query = select(func.count()).select_from(Event)

    filters = []
    if q:
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Event.title.ilike(pattern),
                Event.project_number.ilike(pattern),
                Event.city.ilike(pattern),
                Event.country.ilike(pattern),
                Event.responsible_person.ilike(pattern),
                Event.region.ilike(pattern),
                Event.event_type.ilike(pattern),
                Event.preparation_theme.ilike(pattern),
            )
        )
    if status_filter:
        filters.append(Event.status == status_filter)
    if project_status:
        values = project_status_filter_values(project_status)
        filters.append(Event.project_status.in_(values))
    if event_type:
        filters.append(Event.event_type.ilike(f"%{event_type.strip()}%"))
    if country:
        filters.append(Event.country.ilike(f"%{country.strip()}%"))
    if upcoming:
        today = date.today()
        filters.append(func.coalesce(Event.end_date, Event.start_date) >= today)

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query)
    items = result.scalars().all()
    return EventListResponse(
        items=[_event_to_response(event) for event in items],
        total=total,
    )


@router.get("/", response_model=EventListResponse)
async def list_events(
    q: str | None = Query(default=None, description="Recherche texte"),
    status_filter: str | None = Query(default=None, alias="status"),
    project_status: str | None = Query(default=None, description="Statut AO Alliance (Open, Closed, Cancelled)"),
    event_type: str | None = Query(default=None),
    country: str | None = Query(default=None),
    sort_by: str | None = Query(default="start_date", description="Colonne de tri"),
    sort_dir: str | None = Query(default="desc", description="asc ou desc"),
    upcoming: bool | None = Query(
        default=None,
        description="Si true, uniquement les événements dont la date de fin (ou début) n'est pas passée",
    ),
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventListResponse:
    settings = get_settings()
    key_parts = {
        "q": q,
        "status": status_filter,
        "project_status": project_status,
        "event_type": event_type,
        "country": country,
        "sort_by": sort_by,
        "sort_dir": sort_dir,
        "upcoming": upcoming,
    }
    return await cached_call(
        redis_url=settings.redis_url,
        namespace="events:list",
        key_parts=key_parts,
        ttl_seconds=settings.cache_ttl_seconds,
        enabled=settings.cache_enabled,
        factory=lambda: _list_events_impl(
            db,
            q=q,
            status_filter=status_filter,
            project_status=project_status,
            event_type=event_type,
            country=country,
            sort_by=sort_by,
            sort_dir=sort_dir,
            upcoming=upcoming,
        ),
        serialize=lambda response: response.model_dump(mode="json"),
        deserialize=lambda data: EventListResponse.model_validate(data),
    )


async def _dashboard_stats_impl(db: AsyncSession) -> DashboardStatsResponse:
    result = await db.execute(select(Event))
    events = result.scalars().all()

    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    by_country: dict[str, int] = {}
    by_project_status: dict[str, int] = {}
    by_region: dict[str, int] = {}
    calendar: list[dict] = []
    current_year = datetime.now(timezone.utc).year

    open_count = 0
    closed_count = 0
    cancelled_count = 0

    total_amount = Decimal(0)
    total_payments = Decimal(0)
    total_balance = Decimal(0)
    events_with_amount = 0
    percent_paid_values: list[float] = []

    participants_expected = 0
    participants_real = 0
    events_with_participants = 0

    for event in events:
        by_status[event.status] = by_status.get(event.status, 0) + 1
        type_label = _chart_label(event.event_type, "Non renseigné")
        by_type[type_label] = by_type.get(type_label, 0) + 1
        if event.country:
            by_country[event.country] = by_country.get(event.country, 0) + 1

        normalized_ps = normalize_project_status(event.project_status)
        status_key = normalized_ps or "Unknown"
        by_project_status[status_key] = by_project_status.get(status_key, 0) + 1

        region_label = _chart_label(event.region, "Non renseigné")
        by_region[region_label] = by_region.get(region_label, 0) + 1

        if event.amount_chf is not None:
            total_amount += event.amount_chf
            events_with_amount += 1
        if event.payments_done_chf is not None:
            total_payments += event.payments_done_chf
        if event.balance_to_pay_chf is not None:
            total_balance += event.balance_to_pay_chf
        if event.percent_paid is not None:
            percent_paid_values.append(float(event.percent_paid))

        if event.participants_expected is not None or event.participants_real is not None:
            events_with_participants += 1
        if event.participants_expected is not None:
            participants_expected += event.participants_expected
        if event.participants_real is not None:
            participants_real += event.participants_real
        if normalized_ps == "Open":
            open_count += 1
        elif normalized_ps == "Closed":
            closed_count += 1
        elif normalized_ps == "Cancelled":
            cancelled_count += 1

        if event.start_date:
            end_date = event.end_date or event.start_date
            if normalized_ps == "Open" and _event_overlaps_year(event.start_date, end_date, current_year):
                calendar.append(
                    {
                        "id": str(event.id),
                        "title": event.title,
                        "project_number": event.project_number,
                        "event_type": event.event_type,
                        "start": event.start_date.isoformat(),
                        "end": end_date.isoformat(),
                        "status": event.status,
                        "responsible_person": event.responsible_person,
                        "city": event.city,
                        "country": event.country,
                        "region": event.region,
                        "project_status": event.project_status,
                    }
                )

    active = open_count
    closed = closed_count + cancelled_count

    avg_percent_paid: float | None = None
    if percent_paid_values:
        avg_percent_paid = round(sum(percent_paid_values) / len(percent_paid_values), 1)

    return DashboardStatsResponse(
        total=len(events),
        active=active,
        closed=closed,
        open_count=open_count,
        closed_count=closed_count,
        cancelled_count=cancelled_count,
        by_status=by_status,
        by_type=by_type,
        by_country=by_country,
        by_project_status=by_project_status,
        by_region=_top_region_counts(by_region),
        financial=DashboardFinancialStats(
            total_amount_chf=_to_float(total_amount),
            total_payments_chf=_to_float(total_payments),
            total_balance_chf=_to_float(total_balance),
            events_with_amount=events_with_amount,
            avg_percent_paid=avg_percent_paid,
        ),
        participants=DashboardParticipantsStats(
            expected_total=participants_expected,
            real_total=participants_real,
            events_with_participants=events_with_participants,
        ),
        calendar=calendar,
        calendar_year=current_year,
    )


@router.get("/stats", response_model=DashboardStatsResponse)
async def dashboard_stats(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
    settings = get_settings()
    current_year = datetime.now(timezone.utc).year
    return await cached_call(
        redis_url=settings.redis_url,
        namespace="events:stats",
        key_parts={"year": current_year},
        ttl_seconds=settings.cache_ttl_stats_seconds,
        enabled=settings.cache_enabled,
        factory=lambda: _dashboard_stats_impl(db),
        serialize=lambda response: response.model_dump(mode="json"),
        deserialize=lambda data: DashboardStatsResponse.model_validate(data),
    )


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Event:
    data = payload.model_dump()
    contact_patch: dict[str, str] = {}
    for contact_key in ("responsible_email", "responsible_phone"):
        if contact_key in data:
            value = data.pop(contact_key)
            if value:
                contact_patch[contact_key] = str(value).strip()
    if contact_patch:
        meta = dict(data.get("metadata_json") or {})
        meta.update(contact_patch)
        data["metadata_json"] = meta
    event = Event(**data)
    db.add(event)
    await db.flush()
    await record_audit_event(
        db,
        actor_id=user.id,
        action="event.create",
        entity_type="event",
        entity_id=str(event.id),
        payload={"project_number": event.project_number, "title": event.title},
    )
    await db.commit()
    await db.refresh(event)
    await _invalidate_events_cache()
    return event


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    return await _event_to_response_async(event, db)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    wf_status = await get_event_workflow_status(db, event_id)
    raw = payload.model_dump(exclude_unset=True)
    filtered = filter_update_payload_for_role(raw, roles=list(user.roles), workflow_status=wf_status)

    start = filtered.get("start_date", event.start_date)
    end = filtered.get("end_date", event.end_date)
    validate_event_dates(start_date=start, end_date=end)
    if "start_date" in filtered or "end_date" in filtered:
        assert_event_dates_editable(end_date=end or event.end_date, workflow_status=wf_status)

    teacher_ids = filtered.pop("teacher_ids", None)
    _apply_update(event, EventUpdate(**filtered))
    if teacher_ids is not None:
        await _sync_event_teachers(db, event_id, teacher_ids)
    event.updated_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        actor_id=user.id,
        action="event.update",
        entity_type="event",
        entity_id=str(event.id),
        payload={"project_number": event.project_number},
    )
    await db.commit()
    await db.refresh(event)
    await _invalidate_events_cache()
    return await _event_to_response_async(event, db)


@router.post("/{event_id}/close", response_model=EventResponse)
async def close_event(
    event_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Event:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    event.status = "generated"
    event.updated_at = datetime.now(timezone.utc)
    await record_audit_event(
        db,
        actor_id=user.id,
        action="event.close",
        entity_type="event",
        entity_id=str(event.id),
        payload={"project_number": event.project_number},
    )
    await db.commit()
    await db.refresh(event)
    await _invalidate_events_cache()
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    await record_audit_event(
        db,
        actor_id=user.id,
        action="event.delete",
        entity_type="event",
        entity_id=str(event.id),
        payload={"project_number": event.project_number, "title": event.title},
    )
    await db.delete(event)
    await db.commit()
    await _invalidate_events_cache()

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.project_status import (
    normalize_project_status,
    project_status_filter_values,
)
from app.core.database import get_db
from app.models.event import Event
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
from tip_common.package_types import describe_inferred_event_package
from tip_common.audit import record_audit_event
from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


def _event_payload_for_classify(event: Event) -> dict:
    return {
        "preparation_theme": event.preparation_theme,
        "event_type": event.event_type,
        "title": event.title,
        "start_date": event.start_date,
        "end_date": event.end_date,
    }


def _event_to_response(event: Event) -> EventResponse:
    response = EventResponse.model_validate(event)
    inferred = describe_inferred_event_package(**_event_payload_for_classify(event))
    if inferred:
        return response.model_copy(
            update={"inferred_package": InferredEventPackage.model_validate(inferred)},
        )
    return response


async def _event_to_response_async(event: Event) -> EventResponse:
    """Inférence enrichie (NVIDIA si clé API) pour la fiche événement."""
    from tip_common.nvidia_event_classifier import classify_event_package

    response = EventResponse.model_validate(event)
    inferred = await classify_event_package(_event_payload_for_classify(event))
    if inferred:
        return response.model_copy(
            update={"inferred_package": InferredEventPackage.model_validate(inferred)},
        )
    return response


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
    for key, value in data.items():
        setattr(event, key, value)


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


@router.get("/stats", response_model=DashboardStatsResponse)
async def dashboard_stats(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
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
    return await _event_to_response_async(event)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Event:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    _apply_update(event, payload)
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
    return _event_to_response(event)


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

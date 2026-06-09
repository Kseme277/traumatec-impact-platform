import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.ml.predictor import get_predictor
from app.schemas.correlation import CorrelationDatasetResponse
from app.schemas.predict import PredictEventRequest, PredictEventResponse
from app.services.correlation import build_correlation_dataset
from tip_common.redis_cache import cached_call
from tip_common.security import AuthenticatedUser, get_current_user

router = APIRouter()


async def _load_event_row(session: AsyncSession, event_id: UUID) -> dict | None:
    result = await session.execute(
        text(
            """
            SELECT id, title, amount_chf, city, region, country, preparation_theme,
                   event_type, start_date, metadata_json, participants_expected, participants_real
            FROM events.events
            WHERE id = :id
            """
        ),
        {"id": str(event_id)},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


def _merge_request_with_row(payload: PredictEventRequest, row: dict | None) -> dict:
    base = dict(row or {})
    if payload.total_budget is not None:
        base["amount_chf"] = payload.total_budget
    if payload.city:
        base["city"] = payload.city
    if payload.region:
        base["region"] = payload.region
    if payload.country:
        base["country"] = payload.country
    if payload.preparation_theme:
        base["preparation_theme"] = payload.preparation_theme
    if payload.event_type:
        base["event_type"] = payload.event_type
    if payload.budget_alloue is not None and payload.total_budget is None:
        base["amount_chf"] = payload.budget_alloue
    if payload.mois_evenement and not base.get("start_date"):
        from datetime import date

        base["start_date"] = date(2026, payload.mois_evenement, 15)
    meta = base.get("metadata_json") if isinstance(base.get("metadata_json"), dict) else {}
    excel = meta.get("excel") if isinstance(meta.get("excel"), dict) else {}
    if payload.allocation_logistique is not None:
        excel["logistics_chf"] = payload.allocation_logistique
    if payload.allocation_pedagogique is not None:
        excel["pedagogical_chf"] = payload.allocation_pedagogique
    if payload.ratio_perdiem is not None and payload.total_budget:
        excel["perdiem_chf"] = payload.total_budget * payload.ratio_perdiem
    meta["excel"] = excel
    base["metadata_json"] = meta
    return base


def _predict_request_cacheable(payload: PredictEventRequest) -> bool:
    if payload.event_id is None:
        return False
    overrides = payload.model_dump(exclude={"event_id"}, exclude_none=True)
    return len(overrides) == 0


async def _build_correlation_dataset(db: AsyncSession, cap: int) -> CorrelationDatasetResponse:
    settings = get_settings()
    predictor = get_predictor(settings.models_dir)

    result = await db.execute(
        text(
            """
            SELECT id, title, amount_chf, city, region, country, preparation_theme,
                   event_type, start_date, metadata_json, participants_expected, participants_real
            FROM events.events
            WHERE amount_chf IS NOT NULL AND amount_chf > 0
            ORDER BY start_date DESC NULLS LAST, created_at DESC
            LIMIT :limit
            """
        ),
        {"limit": cap},
    )
    rows = [dict(r) for r in result.mappings().all()]
    predictions = await asyncio.to_thread(
        lambda: [predictor.predict(row) for row in rows],
    )
    payload = build_correlation_dataset(rows, predictions)
    return CorrelationDatasetResponse(**payload)


@router.get("/correlation-dataset", response_model=CorrelationDatasetResponse)
async def correlation_dataset(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 80,
) -> CorrelationDatasetResponse:
    """Jeu de points ML pour scatter plots et matrices de corrélation."""
    cap = min(max(limit, 5), 200)
    settings = get_settings()

    return await cached_call(
        redis_url=settings.redis_url,
        namespace="analytics:correlation",
        key_parts={"limit": cap},
        ttl_seconds=settings.cache_ttl_correlation_seconds,
        enabled=settings.cache_enabled,
        factory=lambda: _build_correlation_dataset(db, cap),
        serialize=lambda response: response.model_dump(mode="json"),
        deserialize=lambda data: CorrelationDatasetResponse.model_validate(data),
    )


async def _predict_event_impl(
    payload: PredictEventRequest,
    db: AsyncSession,
) -> PredictEventResponse:
    settings = get_settings()
    predictor = get_predictor(settings.models_dir)

    row: dict | None = None
    title: str | None = None
    event_id = payload.event_id

    if event_id:
        row = await _load_event_row(db, event_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
        title = str(row.get("title") or "")

    merged = _merge_request_with_row(payload, row)
    if not merged.get("amount_chf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budget insuffisant — renseignez amount_chf ou importez Projects.xlsx",
        )

    result = await asyncio.to_thread(predictor.predict, merged)
    return PredictEventResponse(
        risk_score=float(result["risk_score"]),
        predicted_participants=int(result["predicted_participants"]),
        event_id=event_id,
        event_title=title,
    )


@router.post("/predict-event", response_model=PredictEventResponse)
async def predict_event(
    payload: PredictEventRequest,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PredictEventResponse:
    settings = get_settings()
    cacheable = settings.cache_enabled and _predict_request_cacheable(payload)

    if cacheable and payload.event_id is not None:
        return await cached_call(
            redis_url=settings.redis_url,
            namespace="analytics:predict",
            key_parts={"event_id": str(payload.event_id)},
            ttl_seconds=settings.cache_ttl_seconds,
            enabled=True,
            factory=lambda: _predict_event_impl(payload, db),
            serialize=lambda response: response.model_dump(mode="json"),
            deserialize=lambda data: PredictEventResponse.model_validate(data),
        )

    return await _predict_event_impl(payload, db)

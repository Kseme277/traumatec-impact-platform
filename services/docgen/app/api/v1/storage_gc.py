import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.storage_gc import (
    StorageGcAnalyticsResponse,
    StorageGcConfigResponse,
    StorageGcConfigUpdate,
    StorageGcInventory,
    StorageGcRunResponse,
    StorageGcStats,
)
from app.services.generation_analytics import get_generation_analytics
from app.services.storage_garbage_collector import get_zip_inventory, run_storage_garbage_collection
from tip_common.redis_cache import cached_call
from tip_common.security import AuthenticatedUser, require_admin
from tip_common.storage import get_object_storage
from tip_common.system_settings import (
    GC_ENABLED_KEY,
    GC_RETENTION_DAYS_KEY,
    get_gc_settings,
    set_setting,
)

router = APIRouter()


async def _build_config_response(db: AsyncSession, settings: dict) -> StorageGcConfigResponse:
    retention_days = int(settings["retention_days"])
    inventory_raw = await get_zip_inventory(db, retention_days)
    return StorageGcConfigResponse(
        enabled=bool(settings["enabled"]),
        retention_days=retention_days,
        last_run_at=settings.get("last_run_at"),
        last_stats=_parse_stats(settings.get("last_stats")),
        inventory=StorageGcInventory.model_validate(inventory_raw),
    )


def _parse_stats(raw: str | None) -> StorageGcStats | None:
    if not raw:
        return None
    try:
        return StorageGcStats.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValueError):
        return None


@router.get("/analytics", response_model=StorageGcAnalyticsResponse)
async def get_storage_gc_analytics(
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StorageGcAnalyticsResponse:
    app_settings = get_settings()
    gc_settings = await get_gc_settings(db)
    retention_days = int(gc_settings["retention_days"])

    async def _load() -> StorageGcAnalyticsResponse:
        raw = await get_generation_analytics(db, retention_days)
        return StorageGcAnalyticsResponse.model_validate(raw)

    return await cached_call(
        redis_url=app_settings.redis_url,
        namespace="docgen:storage-analytics",
        key_parts={"retention_days": retention_days},
        ttl_seconds=app_settings.cache_ttl_stats_seconds,
        enabled=app_settings.cache_enabled,
        factory=_load,
        serialize=lambda response: response.model_dump(mode="json"),
        deserialize=lambda data: StorageGcAnalyticsResponse.model_validate(data),
    )


@router.get("/config", response_model=StorageGcConfigResponse)
async def get_storage_gc_config(
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StorageGcConfigResponse:
    settings = await get_gc_settings(db)
    return await _build_config_response(db, settings)


@router.patch("/config", response_model=StorageGcConfigResponse)
async def update_storage_gc_config(
    payload: StorageGcConfigUpdate,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StorageGcConfigResponse:
    if payload.enabled is not None:
        await set_setting(db, GC_ENABLED_KEY, "true" if payload.enabled else "false")
    if payload.retention_days is not None:
        await set_setting(db, GC_RETENTION_DAYS_KEY, str(payload.retention_days))
    await db.commit()
    settings = await get_gc_settings(db)
    return await _build_config_response(db, settings)


@router.post("/run", response_model=StorageGcRunResponse)
async def run_storage_gc_now(
    purge_all: bool = False,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StorageGcRunResponse:
    settings = get_settings()
    if settings.storage_backend.lower() != "minio":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le garbage collector MinIO nécessite STORAGE_BACKEND=minio",
        )
    storage = get_object_storage(settings)
    raw_stats = await run_storage_garbage_collection(db, storage, force=True, purge_all=purge_all)
    stats = StorageGcStats.model_validate(raw_stats)
    message = "Purge complète MinIO terminée" if purge_all else "Nettoyage MinIO terminé"
    return StorageGcRunResponse(message=message, stats=stats)

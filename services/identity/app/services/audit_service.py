import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import AsyncSessionLocal
from app.models.audit import AuditExportConfig, AuditExportFile, AuditLog
from tip_common.storage import AUDIT_EXPORTS_PREFIX, get_object_storage

logger = logging.getLogger(__name__)


async def record_audit_event(
    db: AsyncSession,
    *,
    actor_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    payload: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
        )
    )


async def get_export_config(db: AsyncSession) -> AuditExportConfig:
    result = await db.execute(select(AuditExportConfig).where(AuditExportConfig.id == 1))
    config = result.scalar_one_or_none()
    if config is None:
        config = AuditExportConfig(id=1, interval_hours=24, enabled=True)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def list_export_files(db: AsyncSession, *, limit: int = 50) -> list[AuditExportFile]:
    result = await db.execute(
        select(AuditExportFile).order_by(AuditExportFile.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def list_recent_logs(db: AsyncSession, *, limit: int = 100) -> list[AuditLog]:
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def search_logs(db: AsyncSession, *, query: str, limit: int = 10) -> list[AuditLog]:
    needle = query.strip().lower()
    if not needle:
        return []

    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)
    )
    logs = list(result.scalars().all())
    matched: list[AuditLog] = []
    for log in logs:
        haystack = " ".join(
            filter(
                None,
                [
                    log.action,
                    log.entity_type or "",
                    log.entity_id or "",
                    str(log.actor_id) if log.actor_id is not None else "",
                    json.dumps(log.payload or {}, ensure_ascii=False),
                ],
            )
        ).lower()
        if needle in haystack:
            matched.append(log)
        if len(matched) >= limit:
            break
    return matched


async def get_export_file(db: AsyncSession, export_id: UUID) -> AuditExportFile | None:
    result = await db.execute(select(AuditExportFile).where(AuditExportFile.id == export_id))
    return result.scalar_one_or_none()


async def run_scheduled_export(
    settings: Settings | None = None,
    *,
    manual: bool = False,
) -> AuditExportFile | None:
    settings = settings or get_settings()
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        config = await get_export_config(db)
        if not config.enabled:
            return None

        interval_hours = max(1, config.interval_hours)
        period_end = now
        if manual:
            # Export manuel : fenêtre = intervalle configuré par l'admin
            period_start = period_end - timedelta(hours=interval_hours)
        elif config.last_run_at:
            period_start = config.last_run_at
        else:
            period_start = period_end - timedelta(hours=interval_hours)

        logs_result = await db.execute(
            select(AuditLog)
            .where(AuditLog.created_at >= period_start, AuditLog.created_at < period_end)
            .order_by(AuditLog.created_at.asc())
        )
        logs = list(logs_result.scalars().all())

        meta = {
            "_type": "tip_audit_export",
            "version": 1,
            "app": settings.app_name,
            "interval_hours": interval_hours,
            "manual": manual,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "record_count": len(logs),
            "generated_at": now.isoformat(),
        }
        lines = [json.dumps(meta, ensure_ascii=False, indent=2)]
        for log in logs:
            lines.append(
                json.dumps(
                    {
                        "id": str(log.id),
                        "timestamp": log.created_at.isoformat(),
                        "actor_id": log.actor_id,
                        "action": log.action,
                        "entity_type": log.entity_type,
                        "entity_id": log.entity_id,
                        "payload": log.payload,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
        content = ("\n\n".join(lines) + ("\n" if lines else "")).encode("utf-8")
        stamp = period_end.strftime("%Y%m%d_%H%M%S")
        storage_key = f"{AUDIT_EXPORTS_PREFIX}{stamp}.jsonl"

        if settings.storage_backend.lower() == "minio" and settings.minio_access_key:
            storage = get_object_storage(settings)
            storage.ensure_bucket()
            storage.upload_bytes(storage_key, content, content_type="application/x-ndjson")
        else:
            logger.warning("Export audit ignoré — MinIO non configuré")
            return None

        export_file = AuditExportFile(
            storage_key=storage_key,
            period_start=period_start,
            period_end=period_end,
            record_count=len(logs),
            file_size_bytes=len(content),
        )
        db.add(export_file)
        config.last_run_at = period_end
        await db.commit()
        await db.refresh(export_file)
        logger.info("Export audit %s (%s entrées)", storage_key, len(logs))
        return export_file


def download_export_bytes(settings: Settings, storage_key: str) -> bytes:
    storage = get_object_storage(settings)
    return storage.download_bytes(storage_key)

import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import cast, func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import AsyncSessionLocal
from app.models.audit import AuditExportConfig, AuditExportFile, AuditLog
from app.models.utilisateur import Utilisateur
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


def _audit_log_filters(query: str | None):
    if not query or not query.strip():
        return None
    needle = f"%{query.strip()}%"
    return or_(
        AuditLog.action.ilike(needle),
        AuditLog.entity_type.ilike(needle),
        AuditLog.entity_id.ilike(needle),
        cast(AuditLog.actor_id, String).ilike(needle),
        Utilisateur.nom.ilike(needle),
        Utilisateur.prenom.ilike(needle),
        Utilisateur.email.ilike(needle),
        cast(AuditLog.payload, String).ilike(needle),
    )


def _audit_log_to_dict(log: AuditLog, utilisateur: Utilisateur | None) -> dict:
    actor_name = None
    actor_email = None
    if utilisateur is not None:
        actor_name = f"{utilisateur.prenom} {utilisateur.nom}".strip() or None
        actor_email = utilisateur.email
    return {
        "id": log.id,
        "actor_id": log.actor_id,
        "actor_name": actor_name,
        "actor_email": actor_email,
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "payload": log.payload,
        "created_at": log.created_at,
    }


async def list_logs_paginated(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    query: str | None = None,
) -> tuple[list[dict], int]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size
    filters = _audit_log_filters(query)

    count_stmt = (
        select(func.count(AuditLog.id))
        .select_from(AuditLog)
        .outerjoin(Utilisateur, AuditLog.actor_id == Utilisateur.id)
    )
    if filters is not None:
        count_stmt = count_stmt.where(filters)
    total = (await db.execute(count_stmt)).scalar_one()

    items_stmt = (
        select(AuditLog, Utilisateur)
        .outerjoin(Utilisateur, AuditLog.actor_id == Utilisateur.id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    if filters is not None:
        items_stmt = items_stmt.where(filters)

    result = await db.execute(items_stmt)
    rows = [
        _audit_log_to_dict(log, utilisateur)
        for log, utilisateur in result.all()
    ]
    return rows, total


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
            select(AuditLog, Utilisateur)
            .outerjoin(Utilisateur, AuditLog.actor_id == Utilisateur.id)
            .where(AuditLog.created_at >= period_start, AuditLog.created_at < period_end)
            .order_by(AuditLog.created_at.asc())
        )
        log_rows = list(logs_result.all())

        meta = {
            "_type": "tip_audit_export",
            "version": 1,
            "app": settings.app_name,
            "interval_hours": interval_hours,
            "manual": manual,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "record_count": len(log_rows),
            "generated_at": now.isoformat(),
        }
        lines = [json.dumps(meta, ensure_ascii=False, indent=2)]
        for log, utilisateur in log_rows:
            actor_name = None
            actor_email = None
            if utilisateur is not None:
                actor_name = f"{utilisateur.prenom} {utilisateur.nom}".strip() or None
                actor_email = utilisateur.email
            lines.append(
                json.dumps(
                    {
                        "id": str(log.id),
                        "timestamp": log.created_at.isoformat(),
                        "actor_id": log.actor_id,
                        "actor_name": actor_name,
                        "actor_email": actor_email,
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
            record_count=len(log_rows),
            file_size_bytes=len(content),
        )
        db.add(export_file)
        config.last_run_at = period_end
        await db.commit()
        await db.refresh(export_file)
        logger.info("Export audit %s (%s entrées)", storage_key, len(log_rows))
        return export_file


def download_export_bytes(settings: Settings, storage_key: str) -> bytes:
    storage = get_object_storage(settings)
    return storage.download_bytes(storage_key)

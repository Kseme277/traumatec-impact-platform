from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.deps.auth import require_admin
from app.models.utilisateur import Utilisateur
from app.schemas.audit import (
    AuditExportConfigResponse,
    AuditExportConfigUpdate,
    AuditExportFileResponse,
    AuditLogListResponse,
    AuditLogResponse,
)
from app.services.audit_service import (
    record_audit_event,
    download_export_bytes,
    get_export_config,
    get_export_file,
    list_export_files,
    list_logs_paginated,
    run_scheduled_export,
)

router = APIRouter()


@router.get("/events", response_model=AuditLogListResponse)
async def list_audit_events(
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    items, total = await list_logs_paginated(db, page=page, page_size=page_size, query=q)
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/exports", response_model=list[AuditExportFileResponse])
async def list_audit_exports(
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AuditExportFileResponse]:
    files = await list_export_files(db)
    return [AuditExportFileResponse.model_validate(item) for item in files]


@router.get("/exports/{export_id}/download")
async def download_audit_export(
    export_id: UUID,
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    export_file = await get_export_file(db, export_id)
    if export_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export introuvable")

    try:
        data = download_export_bytes(settings, export_file.storage_key)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossible de lire le fichier depuis MinIO",
        ) from exc

    filename = export_file.storage_key.rsplit("/", 1)[-1]
    return Response(
        content=data,
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/config", response_model=AuditExportConfigResponse)
async def get_audit_export_config(
    _: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AuditExportConfigResponse:
    config = await get_export_config(db)
    return AuditExportConfigResponse.model_validate(config)


@router.put("/config", response_model=AuditExportConfigResponse)
async def update_audit_export_config(
    payload: AuditExportConfigUpdate,
    admin: Utilisateur = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AuditExportConfigResponse:
    config = await get_export_config(db)
    config.interval_hours = payload.interval_hours
    config.enabled = payload.enabled
    config.updated_by_id = admin.id
    await record_audit_event(
        db,
        actor_id=admin.id,
        action="audit.config_update",
        entity_type="audit_config",
        entity_id="1",
        payload={"interval_hours": payload.interval_hours, "enabled": payload.enabled},
    )
    await db.commit()
    await db.refresh(config)
    return AuditExportConfigResponse.model_validate(config)


@router.post("/exports/run", response_model=AuditExportFileResponse)
async def trigger_audit_export(
    _: Utilisateur = Depends(require_admin),
) -> AuditExportFileResponse:
    export_file = await run_scheduled_export(manual=True)
    if export_file is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Export désactivé ou stockage MinIO indisponible",
        )
    return AuditExportFileResponse.model_validate(export_file)

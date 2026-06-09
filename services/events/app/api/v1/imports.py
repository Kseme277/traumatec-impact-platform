import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.event import AnnualImport
from app.schemas.event import ImportJobProgressResponse, ImportJobStartResponse, ImportResultResponse
from app.services.annual_import_runner import run_annual_import_job
from app.services.import_jobs import import_job_store
from tip_common.audit import record_audit_event
from tip_common.security import AuthenticatedUser, require_admin

router = APIRouter()


@router.post(
    "/annual-plan",
    response_model=ImportJobStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def import_annual_plan(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ImportJobStartResponse:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier Excel requis (.xlsx)",
        )

    content = await file.read()
    await record_audit_event(
        db,
        actor_id=user.id,
        action="event.import_start",
        entity_type="import",
        payload={"filename": file.filename},
    )
    await db.commit()

    job = await import_job_store.create(filename=file.filename, imported_by_id=user.id)
    asyncio.create_task(
        run_annual_import_job(
            job_id=job.id,
            content=content,
            filename=file.filename,
            user_id=user.id,
        )
    )

    return ImportJobStartResponse(job_id=job.id, filename=file.filename)


@router.get("/annual-plan/jobs/{job_id}", response_model=ImportJobProgressResponse)
async def get_import_job_progress(job_id: UUID) -> ImportJobProgressResponse:
    """Suivi d'import sans auth JWT — évite les erreurs CORS/token sur les imports longs."""
    job = await import_job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import introuvable")

    progress = import_job_store.to_progress(job)
    result = progress.get("result")
    return ImportJobProgressResponse(
        job_id=progress["job_id"],
        status=progress["status"],
        phase=progress["phase"],
        processed=progress["processed"],
        total=progress["total"],
        percent=progress["percent"],
        message=progress["message"],
        filename=progress["filename"],
        result=ImportResultResponse(**result) if result else None,
        error=progress["error"],
    )


@router.get("/")
async def list_imports(
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(select(AnnualImport).order_by(AnnualImport.created_at.desc()))
    imports = result.scalars().all()
    return [
        {
            "id": str(item.id),
            "year": item.year,
            "filename": item.filename,
            "row_count": item.row_count,
            "created_at": item.created_at.isoformat(),
        }
        for item in imports
    ]

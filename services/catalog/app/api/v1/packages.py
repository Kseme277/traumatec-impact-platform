import asyncio
import os
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.catalog import PackageBundle
from app.core.database import AsyncSessionLocal
from app.schemas.catalog import (
    PackageBundleResponse,
    PackageImportJobProgressResponse,
    PackageImportJobStartResponse,
)
from app.services.package_import import (
    activate_package_bundle,
    bootstrap_system_packages,
    delete_package_bundle,
    export_bundle_zip,
    export_package_type_zip,
)
from app.services.package_import_jobs import package_import_job_store, run_package_import_job
from tip_common.package_types import list_package_types_by_activity
from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


@router.get("/types")
async def list_event_package_types(
    _: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    return list_package_types_by_activity()


@router.get("/bundles", response_model=list[PackageBundleResponse])
async def list_package_bundles(
    package_type: str | None = Query(default=None),
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PackageBundle]:
    query = select(PackageBundle).order_by(
        PackageBundle.package_type,
        PackageBundle.version.desc(),
    )
    if package_type:
        query = query.where(PackageBundle.package_type == package_type.upper())
    result = await db.execute(query)
    return list(result.scalars().all())


def _upload_scan_use_ai() -> bool:
    return os.getenv("CATALOG_IMPORT_SCAN_USE_AI", "").strip().lower() in ("1", "true", "yes")


@router.post(
    "/upload",
    response_model=PackageImportJobStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_package_zip(
    file: UploadFile = File(...),
    package_type: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    activate: bool = Form(default=True),
    use_ai: bool = Form(default=False),
    user: AuthenticatedUser = Depends(require_admin),
) -> PackageImportJobStartResponse:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier ZIP requis (.zip).",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fichier ZIP vide.")

    use_ai = use_ai or _upload_scan_use_ai()
    job = await package_import_job_store.create(
        filename=file.filename,
        uploaded_by_id=user.id,
        use_ai=use_ai,
    )
    hint = package_type.upper().replace("-", "_") if package_type else None

    asyncio.create_task(
        run_package_import_job(
            AsyncSessionLocal,
            job_id=job.id,
            zip_bytes=raw,
            filename=file.filename,
            package_type_hint=hint,
            notes=notes,
            activate=activate,
            uploaded_by_id=user.id,
            use_ai=use_ai,
        )
    )

    return PackageImportJobStartResponse(job_id=job.id, filename=file.filename)


@router.get("/import-jobs/{job_id}", response_model=PackageImportJobProgressResponse)
async def get_package_import_job(job_id: UUID) -> PackageImportJobProgressResponse:
    """Suivi d'import paquet — sans auth JWT (imports longs, analyse IA)."""
    job = await package_import_job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import introuvable")

    progress = package_import_job_store.to_progress(job)
    return PackageImportJobProgressResponse(**progress)


@router.post("/bootstrap")
async def bootstrap_packages(
    force: bool = Form(default=False),
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Importe les paquets depuis package-zips/ (système) s'ils ne sont pas déjà en base."""
    settings = get_settings()
    try:
        summaries = await bootstrap_system_packages(
            db,
            settings,
            uploaded_by_id=user.id,
            force=force,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import système impossible : {exc}",
        ) from exc

    if not summaries:
        return {
            "imported": 0,
            "message": "Tous les paquets système sont déjà importés.",
        }
    types = ", ".join(s["package_type"] for s in summaries)
    return {
        "imported": len(summaries),
        "message": f"{len(summaries)} paquet(s) importé(s) : {types}.",
        "packages": summaries,
    }


@router.get("/types/{package_type}/download")
async def download_package_type_zip(
    package_type: str,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    try:
        data, filename = await export_package_type_zip(db, settings, package_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export ZIP impossible : {exc}",
        ) from exc

    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/bundles/{bundle_id}/download")
async def download_bundle_zip(
    bundle_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    try:
        data, filename = await export_bundle_zip(db, settings, bundle_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export ZIP impossible : {exc}",
        ) from exc

    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/bundles/{bundle_id}/activate", response_model=PackageBundleResponse)
async def activate_bundle(
    bundle_id: UUID,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PackageBundle:
    settings = get_settings()
    try:
        bundle = await activate_package_bundle(db, settings, bundle_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return bundle


@router.delete("/bundles/{bundle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bundle(
    bundle_id: UUID,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    settings = get_settings()
    try:
        await delete_package_bundle(db, settings, bundle_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

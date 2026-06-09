from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.catalog import PackageBundle
from app.schemas.catalog import (
    PackageBundleResponse,
    PackageUploadResponse,
)
from app.services.package_import import (
    activate_package_bundle,
    bootstrap_system_packages,
    delete_package_bundle,
    export_bundle_zip,
    export_package_type_zip,
    import_package_zip,
)
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


@router.post("/upload", response_model=PackageUploadResponse)
async def upload_package_zip(
    file: UploadFile = File(...),
    package_type: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    activate: bool = Form(default=True),
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> PackageUploadResponse:
    raw = await file.read()
    settings = get_settings()
    hint = package_type.upper().replace("-", "_") if package_type else None
    try:
        summary = await import_package_zip(
            db,
            settings,
            zip_bytes=raw,
            filename=file.filename or "paquet.zip",
            uploaded_by_id=user.id,
            package_type_hint=hint,
            notes=notes,
            activate=activate,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Échec import ZIP : {exc}",
        ) from exc

    bundle = await db.get(PackageBundle, UUID(summary["bundle_id"]))
    if bundle is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Bundle introuvable")
    return PackageUploadResponse(
        bundle=PackageBundleResponse.model_validate(bundle),
        message=(
            f"Paquet {summary['package_type']} v{summary['version']} importé "
            f"({summary['file_count']} fichiers)."
        ),
        analysis=summary["analysis"],
    )


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
    try:
        bundle = await activate_package_bundle(db, bundle_id)
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

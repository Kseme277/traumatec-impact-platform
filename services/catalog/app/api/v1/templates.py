from typing import Literal
from uuid import UUID

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.catalog import EventProfile, PackageTemplate
from app.schemas.catalog import (
    PackageTemplateResponse,
    TemplateEditorConfigResponse,
    TemplateUploadResponse,
    TemplateVariablesGuideResponse,
)
from app.services.onlyoffice import (
    build_editor_config,
    handle_onlyoffice_callback,
    is_onlyoffice_supported,
    onlyoffice_file_response,
    verify_access_token,
)
from app.services.template_field_analysis import analyze_template_in_db
from app.services.template_files import (
    download_template_bytes,
    get_template_or_404,
    replace_template_file,
)
from tip_common.redis_cache import cached_call
from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


@router.get("/variables-guide", response_model=TemplateVariablesGuideResponse)
async def template_variables_guide(
    locale: str = Query(default="fr", description="fr | en"),
    _: AuthenticatedUser = Depends(get_current_user),
) -> TemplateVariablesGuideResponse:
    """Registre des variables reconnues à la génération (placeholders + champs événement)."""
    from tip_common.variable_registry import build_variables_guide

    payload = build_variables_guide(locale=locale)
    return TemplateVariablesGuideResponse.model_validate(payload)


async def _list_templates_impl(
    db: AsyncSession,
    *,
    theme: str | None,
    package_type: str | None,
    bundle_id: UUID | None,
) -> list[PackageTemplate]:
    query = select(PackageTemplate).where(PackageTemplate.is_active.is_(True))
    result = await db.execute(query)
    items = list(result.scalars().all())
    if theme:
        items = [t for t in items if theme in (t.preparation_themes or [])]
    if package_type:
        code = package_type.upper().replace("-", "_")
        by_meta = [
            t
            for t in items
            if (t.placeholders or {}).get("package_type") == code
        ]
        if by_meta:
            items = by_meta
        else:
            profile_result = await db.execute(
                select(EventProfile).where(
                    EventProfile.package_type == code,
                    EventProfile.is_active.is_(True),
                )
            )
            profile = profile_result.scalar_one_or_none()
            if profile and profile.package_template_ids:
                allowed = {str(tid) for tid in profile.package_template_ids}
                items = [t for t in items if str(t.id) in allowed]
    if bundle_id:
        bid = str(bundle_id)
        items = [t for t in items if (t.placeholders or {}).get("bundle_id") == bid]
    items.sort(
        key=lambda t: (t.placeholders or {}).get("package_file_order", 0),
    )
    return items


@router.get("/", response_model=list[PackageTemplateResponse])
async def list_templates(
    theme: str | None = Query(default=None, description="pbo | operatory | iec"),
    package_type: str | None = Query(default=None, description="OP_S, PBO_S, IEC_S, OP_C, …"),
    bundle_id: UUID | None = Query(default=None),
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PackageTemplateResponse]:
    settings = get_settings()
    key_parts = {
        "theme": theme,
        "package_type": package_type,
        "bundle_id": str(bundle_id) if bundle_id else None,
    }
    async def _load() -> list[PackageTemplateResponse]:
        items = await _list_templates_impl(db, theme=theme, package_type=package_type, bundle_id=bundle_id)
        return [PackageTemplateResponse.model_validate(item) for item in items]

    return await cached_call(
        redis_url=settings.redis_url,
        namespace="catalog:templates",
        key_parts=key_parts,
        ttl_seconds=settings.cache_ttl_seconds,
        enabled=settings.cache_enabled,
        factory=_load,
        serialize=lambda items: [item.model_dump(mode="json") for item in items],
        deserialize=lambda data: [PackageTemplateResponse.model_validate(item) for item in data],
    )


@router.post("/{template_id}/analyze-fields")
async def analyze_template_fields_endpoint(
    template_id: UUID,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Relance l'analyse IA (NVIDIA ou règles) des champs à remplacer pour un template."""
    settings = get_settings()
    try:
        return await analyze_template_in_db(db, settings, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analyse impossible : {exc}",
        ) from exc


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_template(
    template_id: UUID,
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    template = await db.get(PackageTemplate, template_id)
    if template is None or not template.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable")
    template.is_active = False
    await db.commit()


@router.get("/{template_id}/editor-config", response_model=TemplateEditorConfigResponse)
async def template_editor_config(
    template_id: UUID,
    mode: Literal["view", "edit"] = "view",
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TemplateEditorConfigResponse:
    settings = get_settings()
    try:
        template = await get_template_or_404(db, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if not is_onlyoffice_supported(template):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Format non supporté. Utilisez Word (.doc, .docx, .odt) ou Excel (.xlsx, .xls).",
        )
    if mode == "edit" and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Édition réservée aux administrateurs.",
        )
    try:
        payload = build_editor_config(
            settings,
            template,
            mode=mode,
            user_id=str(user.id),
            user_name=f"{user.prenom} {user.nom}".strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return TemplateEditorConfigResponse(
        document_server_url=payload["documentServerUrl"],
        config=payload["config"],
    )


@router.get("/{template_id}/onlyoffice-file")
async def onlyoffice_template_file(
    template_id: UUID,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    if not verify_access_token(settings, template_id, "file", token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Jeton ONLYOFFICE invalide")

    try:
        template = await get_template_or_404(db, template_id)
        data, filename, content_type = await onlyoffice_file_response(settings, template)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du stockage.",
        ) from exc

    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/{template_id}/onlyoffice-callback")
async def onlyoffice_template_callback(
    template_id: UUID,
    request: Request,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    settings = get_settings()
    if not verify_access_token(settings, template_id, "callback", token):
        return JSONResponse({"error": 1}, status_code=status.HTTP_403_FORBIDDEN)

    template = await get_template_or_404(db, template_id)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": 1})

    try:
        result = await handle_onlyoffice_callback(db, settings, template, body)
        return JSONResponse(result)
    except Exception as exc:
        logger = __import__("logging").getLogger(__name__)
        logger.exception("ONLYOFFICE callback échec template=%s: %s", template_id, exc)
        return JSONResponse({"error": 1})


@router.get("/{template_id}/download")
async def download_template(
    template_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    template: PackageTemplate | None = None
    try:
        template = await get_template_or_404(db, template_id)
        data, filename, content_type = await download_template_bytes(settings, template)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"NoSuchKey", "404", "NotFound"}:
            storage_path = template.file_path if template else str(template_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Fichier absent du stockage ({storage_path}). "
                    "Réimportez le paquet ZIP ou remplacez le fichier."
                ),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Téléchargement impossible depuis le stockage.",
        ) from exc

    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.put("/{template_id}/file", response_model=TemplateUploadResponse)
async def replace_template(
    template_id: UUID,
    file: UploadFile = File(...),
    _: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TemplateUploadResponse:
    settings = get_settings()
    try:
        template = await replace_template_file(
            db, settings, template_id=template_id, file=file
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Remplacement impossible : {exc}",
        ) from exc

    return TemplateUploadResponse(
        template=template,
        message=f"Fichier du template {template.code} mis à jour.",
    )

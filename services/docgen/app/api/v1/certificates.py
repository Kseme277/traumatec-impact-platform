import json
from uuid import UUID, uuid4

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.certificate import (
    CertificateEditorConfigResponse,
    CertificateGenerationListResponse,
    CertificateGenerationResponse,
    CertificateTitleSuggestionResponse,
)
from app.services.certificate_onlyoffice import (
    DOCX_CONTENT_TYPE,
    ZIP_CONTENT_TYPE,
    build_certificate_editor_config,
    download_certificate_bytes,
    verify_access_token,
)
from app.services.docgen.certificate_pipeline import (
    RoleFilter,
    build_event_certificate_context,
    generate_certificates_docx,
)
from tip_common.audit import record_audit_event
from tip_common.security import AuthenticatedUser, get_current_user
from tip_common.storage import get_object_storage

router = APIRouter()


class CertificateGenerateRequest(BaseModel):
    role_filter: RoleFilter = Field(
        default="all",
        description="all | participant | enseignant",
    )
    event_title: str | None = Field(
        default=None,
        max_length=2000,
        description="Titre affiché sur le certificat (saisie utilisateur ou issu de l'export Excel).",
    )


def _storage_key(event_id: UUID, generation_id: UUID, filename: str) -> str:
    return f"generations/certificates/{event_id}/{generation_id}/{filename}"


def _preview_storage_key(event_id: UUID, generation_id: UUID) -> str:
    return _storage_key(event_id, generation_id, "preview.docx")


def _download_content_type(filename: str) -> str:
    if filename.lower().endswith(".zip"):
        return ZIP_CONTENT_TYPE
    return DOCX_CONTENT_TYPE


def _preview_file_row(row: dict) -> tuple[str, str]:
    preview_key = row.get("preview_storage_key")
    preview_name = row.get("preview_filename")
    if preview_key:
        return preview_key, preview_name or row["filename"]
    return row["storage_key"], row["filename"]


def _row_to_response(row: dict) -> CertificateGenerationResponse:
    prenom = row.get("prenom") or ""
    nom = row.get("nom") or ""
    name = f"{prenom} {nom}".strip() or None
    return CertificateGenerationResponse(
        id=row["id"],
        event_id=row["event_id"],
        requested_by_id=row["requested_by_id"],
        requested_by_name=name,
        role_filter=row["role_filter"],
        certificate_count=row["certificate_count"],
        storage_key=row["storage_key"],
        filename=row["filename"],
        created_at=row["created_at"],
    )


async def _get_generation_row(db: AsyncSession, generation_id: UUID) -> dict | None:
    result = await db.execute(
        text(
            """
            SELECT g.id, g.event_id, g.requested_by_id, g.role_filter,
                   g.certificate_count, g.storage_key, g.filename,
                   g.preview_storage_key, g.preview_filename, g.created_at,
                   u.prenom, u.nom
            FROM docgen.certificate_generations g
            LEFT JOIN identity.utilisateurs u ON u.id = g.requested_by_id
            WHERE g.id = :id
            """
        ),
        {"id": str(generation_id)},
    )
    row = result.mappings().one_or_none()
    return dict(row) if row else None


@router.get("/events/{event_id}/generations", response_model=CertificateGenerationListResponse)
async def list_certificate_generations(
    event_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CertificateGenerationListResponse:
    result = await db.execute(
        text(
            """
            SELECT g.id, g.event_id, g.requested_by_id, g.role_filter,
                   g.certificate_count, g.storage_key, g.filename,
                   g.preview_storage_key, g.preview_filename, g.created_at,
                   u.prenom, u.nom
            FROM docgen.certificate_generations g
            LEFT JOIN identity.utilisateurs u ON u.id = g.requested_by_id
            WHERE g.event_id = :event_id
            ORDER BY g.created_at DESC
            LIMIT 50
            """
        ),
        {"event_id": str(event_id)},
    )
    rows = [dict(r) for r in result.mappings().all()]
    return CertificateGenerationListResponse(
        items=[_row_to_response(row) for row in rows],
        total=len(rows),
    )


@router.get("/events/{event_id}/title-suggestion", response_model=CertificateTitleSuggestionResponse)
async def suggest_certificate_title(
    event_id: UUID,
    refresh: bool = Query(False, description="Reformater le titre Excel avec l'IA"),
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CertificateTitleSuggestionResponse:
    event_row = await db.execute(
        text(
            """
            SELECT id, project_number, title, city, country, region,
                   start_date::text, end_date::text, preparation_theme,
                   responsible_person, certificate_context_json
            FROM events.events
            WHERE id = :id
            """
        ),
        {"id": str(event_id)},
    )
    event = event_row.mappings().one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    event_dict = dict(event)
    raw_ctx = event_dict.get("certificate_context_json")
    if isinstance(raw_ctx, str) and raw_ctx.strip():
        try:
            cert_ctx = json.loads(raw_ctx)
        except json.JSONDecodeError:
            cert_ctx = {}
    elif isinstance(raw_ctx, dict):
        cert_ctx = dict(raw_ctx)
    else:
        cert_ctx = {}

    source_title = (cert_ctx.get("source_event_title") or "").strip() or None
    if not source_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Aucun titre d'événement dans l'export Excel. "
                "Importez d'abord le fichier participants (colonne Nom_evenement)."
            ),
        )

    cert_context = await build_event_certificate_context(
        event_dict,
        refresh_ai=refresh,
    )
    return CertificateTitleSuggestionResponse(
        source_event_title=source_title,
        title_suggested=cert_context["title_formal"],
        title_formatted=cert_ctx.get("title_formatted"),
    )


@router.post("/events/{event_id}/generate", response_model=CertificateGenerationResponse)
async def generate_event_certificates(
    event_id: UUID,
    payload: CertificateGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CertificateGenerationResponse:
    settings = get_settings()
    event_row = await db.execute(
        text(
            """
            SELECT id, project_number, title, city, country, region,
                   start_date::text, end_date::text, preparation_theme,
                   responsible_person, certificate_context_json
            FROM events.events
            WHERE id = :id
            """
        ),
        {"id": str(event_id)},
    )
    event = event_row.mappings().one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")

    participants_row = await db.execute(
        text(
            """
            SELECT full_name, last_name, first_name, certificate_role,
                   hospital, email, statut, identity_key
            FROM events.participants
            WHERE event_id = :event_id
            ORDER BY full_name
            """
        ),
        {"event_id": str(event_id)},
    )
    participants = [dict(r) for r in participants_row.mappings().all()]
    if not participants:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Aucun participant importé pour cet événement. "
                "Importez d'abord l'export Excel de la plateforme d'inscription."
            ),
        )

    event_dict = dict(event)
    custom_title = (payload.event_title or "").strip() or None
    try:
        cert_context = await build_event_certificate_context(event_dict, custom_title=custom_title)
        raw_ctx = event_dict.get("certificate_context_json")
        if isinstance(raw_ctx, str) and raw_ctx.strip():
            try:
                ctx = json.loads(raw_ctx)
            except json.JSONDecodeError:
                ctx = {}
        elif isinstance(raw_ctx, dict):
            ctx = dict(raw_ctx)
        else:
            ctx = {}
        ctx["title_formatted"] = cert_context["title_formal"]
        ctx["date_single_formatted"] = cert_context["date_single"]
        ctx["city_formatted"] = cert_context["city"]
        ctx["country_formatted"] = cert_context["country"]
        await db.execute(
            text(
                """
                UPDATE events.events
                SET certificate_context_json = CAST(:ctx AS jsonb)
                WHERE id = :id
                """
            ),
            {"ctx": json.dumps(ctx), "id": str(event_id)},
        )
        event_dict["certificate_context_json"] = ctx

        zip_bytes, preview_bytes, count, filename, preview_filename = await generate_certificates_docx(
            event=event_dict,
            participants=participants,
            role_filter=payload.role_filter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    generation_id = uuid4()
    storage_key = _storage_key(event_id, generation_id, filename)
    preview_key = _preview_storage_key(event_id, generation_id)
    storage = get_object_storage(settings)
    storage.ensure_bucket()
    storage.upload_bytes(storage_key, zip_bytes, content_type=ZIP_CONTENT_TYPE)
    storage.upload_bytes(preview_key, preview_bytes, content_type=DOCX_CONTENT_TYPE)

    await db.execute(
        text(
            """
            INSERT INTO docgen.certificate_generations (
                id, event_id, requested_by_id, role_filter,
                certificate_count, storage_key, filename,
                preview_storage_key, preview_filename
            )
            VALUES (
                :id, :event_id, :requested_by_id, :role_filter,
                :certificate_count, :storage_key, :filename,
                :preview_storage_key, :preview_filename
            )
            """
        ),
        {
            "id": str(generation_id),
            "event_id": str(event_id),
            "requested_by_id": user.id,
            "role_filter": payload.role_filter,
            "certificate_count": count,
            "storage_key": storage_key,
            "filename": filename,
            "preview_storage_key": preview_key,
            "preview_filename": preview_filename,
        },
    )

    actor_name = f"{user.prenom} {user.nom}".strip()
    await record_audit_event(
        db,
        actor_id=user.id,
        action="certificate.generate",
        entity_type="event",
        entity_id=str(event_id),
        payload={
            "generation_id": str(generation_id),
            "role_filter": payload.role_filter,
            "certificate_count": count,
            "filename": filename,
            "storage_key": storage_key,
            "actor_name": actor_name,
            "event_title": event.get("title"),
        },
    )
    await db.commit()

    row = await _get_generation_row(db, generation_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Enregistrement introuvable")
    return _row_to_response(row)


@router.get("/generations/{generation_id}/download")
async def download_certificate_generation(
    generation_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    row = await _get_generation_row(db, generation_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Génération introuvable")

    try:
        data = download_certificate_bytes(settings, row["storage_key"])
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du stockage MinIO.",
        ) from exc

    return Response(
        content=data,
        media_type=_download_content_type(row["filename"]),
        headers={"Content-Disposition": f'attachment; filename="{row["filename"]}"'},
    )


@router.get("/generations/{generation_id}/editor-config", response_model=CertificateEditorConfigResponse)
async def certificate_editor_config(
    generation_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CertificateEditorConfigResponse:
    settings = get_settings()
    row = await _get_generation_row(db, generation_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Génération introuvable")

    _, preview_filename = _preview_file_row(row)
    payload = build_certificate_editor_config(
        settings,
        generation_id=generation_id,
        filename=preview_filename,
        created_at=row["created_at"],
        user_id=str(user.id),
        user_name=f"{user.prenom} {user.nom}".strip(),
    )
    return CertificateEditorConfigResponse(
        document_server_url=payload["document_server_url"],
        config=payload["config"],
    )


@router.get("/generations/{generation_id}/onlyoffice-file")
async def certificate_onlyoffice_file(
    generation_id: UUID,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    if not verify_access_token(settings, generation_id, "file", token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Jeton ONLYOFFICE invalide")

    row = await _get_generation_row(db, generation_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Génération introuvable")

    preview_key, preview_filename = _preview_file_row(row)
    try:
        data = download_certificate_bytes(settings, preview_key)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du stockage.",
        ) from exc

    return Response(
        content=data,
        media_type=DOCX_CONTENT_TYPE,
        headers={"Content-Disposition": f'inline; filename="{preview_filename}"'},
    )

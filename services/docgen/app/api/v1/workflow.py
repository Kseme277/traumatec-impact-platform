from uuid import UUID

import asyncio

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.certificate import CertificateEditorConfigResponse
from app.schemas.workflow import (
    AssignReviewerPayload,
    CompleteProcedurePayload,
    DeliveryMailtoResponse,
    FileCommentPayload,
    FileReviewPayload,
    RejectPayload,
    SubmitPayload,
    SubmitResponse,
    WorkflowQueueItem,
    WorkflowStateResponse,
    WorkflowStatsResponse,
)
from app.services import package_workflow as wf
from app.services.package_file_storage import file_revision, rebuild_job_zip_for_id
from app.services.package_file_onlyoffice import (
    build_package_file_editor_config,
    content_type_for_filename,
    document_key,
    download_package_file_bytes,
    handle_package_file_callback,
    onlyoffice_document_meta,
    trigger_onlyoffice_forcesave,
    verify_access_token,
)
from app.services.package_file_utils import resolve_package_file
from tip_common.security import (
    AuthenticatedUser,
    get_current_user,
    require_can_review_procedure,
    require_can_submit,
    require_can_validate_final,
)

router = APIRouter()
stats_router = APIRouter()


@stats_router.get("/stats", response_model=WorkflowStatsResponse)
async def get_workflow_stats(
    role: str = Query("support", pattern="^(support|controle|validateur|admin)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStatsResponse:
    data = await wf.workflow_stats(db, role_filter=role, user_id=user.id)
    return WorkflowStatsResponse(**data)


@stats_router.get("/queue", response_model=list[WorkflowQueueItem])
async def get_workflow_queue(
    role: str = Query("support", pattern="^(support|controle|validateur|admin)$"),
    limit: int = Query(50, ge=1, le=200),
    queue_scope: str = Query("pending", pattern="^(pending|delivery|history)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WorkflowQueueItem]:
    rows = await wf.list_workflow_queue(
        db, role_filter=role, user_id=user.id, limit=limit, queue_scope=queue_scope
    )
    return [WorkflowQueueItem(**row) for row in rows]


@router.post("/{job_id}/submit", response_model=SubmitResponse)
async def submit_package(
    job_id: UUID,
    payload: SubmitPayload,
    user: AuthenticatedUser = Depends(require_can_submit),
    db: AsyncSession = Depends(get_db),
) -> SubmitResponse:
    state = await wf.submit_job(db, job_id, user, payload.reviewer_id)
    return SubmitResponse(workflow=WorkflowStateResponse(**state))


@router.post("/{job_id}/assign-reviewer", response_model=WorkflowStateResponse)
async def assign_reviewer(
    job_id: UUID,
    payload: AssignReviewerPayload,
    user: AuthenticatedUser = Depends(require_can_review_procedure),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.assign_reviewer(db, job_id, user, payload.reviewer_id)
    return WorkflowStateResponse(**state)


@router.get("/{job_id}/workflow", response_model=WorkflowStateResponse)
async def get_workflow(
    job_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    from tip_common.event_scope import assert_event_access

    job = await wf._get_job_row(db, job_id)
    assert_event_access(user, job.get("organizer_responsible_user_id"))
    state = await wf.get_workflow_state(db, job_id)
    return WorkflowStateResponse(**state)


@router.get("/{job_id}/files", response_model=list)
async def list_job_files(
    job_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    state = await wf.get_workflow_state(db, job_id)
    return state["files"]


@router.post("/{job_id}/file-reviews/{review_id}/review", response_model=WorkflowStateResponse)
async def review_file_by_id(
    job_id: UUID,
    review_id: UUID,
    payload: FileReviewPayload,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    row = await wf.get_file_review_row(db, job_id, review_id)
    state = await wf.review_file(
        db,
        job_id,
        user,
        str(row["template_code"]),
        review_status=payload.status,
        comment=payload.comment,
    )
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/file-reviews/{review_id}/comment", response_model=WorkflowStateResponse)
async def save_file_comment_by_id(
    job_id: UUID,
    review_id: UUID,
    payload: FileCommentPayload,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    row = await wf.get_file_review_row(db, job_id, review_id)
    state = await wf.save_file_comment(
        db,
        job_id,
        user,
        str(row["template_code"]),
        comment=payload.comment,
    )
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/files/{template_code:path}/review", response_model=WorkflowStateResponse)
async def review_file(
    job_id: UUID,
    template_code: str,
    payload: FileReviewPayload,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.review_file(
        db,
        job_id,
        user,
        template_code,
        review_status=payload.status,
        comment=payload.comment,
    )
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/files/{template_code:path}/comment", response_model=WorkflowStateResponse)
async def save_file_comment(
    job_id: UUID,
    template_code: str,
    payload: FileCommentPayload,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.save_file_comment(
        db,
        job_id,
        user,
        template_code,
        comment=payload.comment,
    )
    return WorkflowStateResponse(**state)


@router.get("/{job_id}/files/{template_code:path}/editor-config", response_model=CertificateEditorConfigResponse)
async def package_file_editor_config(
    job_id: UUID,
    template_code: str,
    mode: str = Query(default="view", pattern="^(view|edit)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CertificateEditorConfigResponse:
    settings = get_settings()
    job = await wf._get_job_row(db, job_id)
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    if mode == "edit":
        wf.assert_package_editable(job, user)
    else:
        from tip_common.event_scope import assert_event_access

        assert_event_access(user, job.get("organizer_responsible_user_id"))
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    _, filename = resolve_package_file(job, resolved_code)
    if onlyoffice_document_meta(filename) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Prévisualisation indisponible pour ce type de fichier — utilisez le téléchargement",
        )
    payload = build_package_file_editor_config(
        settings,
        job_id=job_id,
        template_code=resolved_code,
        filename=filename,
        user_id=str(user.id),
        user_name=f"{user.prenom} {user.nom}".strip(),
        mode=mode,
        trace=job.get("template_versions_json"),
    )
    revision = file_revision(job.get("template_versions_json"), resolved_code)
    return CertificateEditorConfigResponse(
        document_server_url=payload["document_server_url"],
        config=payload["config"],
        file_revision=revision,
    )


@router.get("/{job_id}/files/{template_code:path}/file-revision")
async def package_file_revision(
    job_id: UUID,
    template_code: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = await wf._get_job_row(db, job_id)
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    from tip_common.event_scope import assert_event_access

    assert_event_access(user, job.get("organizer_responsible_user_id"))
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    return {"revision": file_revision(job.get("template_versions_json"), resolved_code)}


@router.post("/{job_id}/files/{template_code:path}/onlyoffice-forcesave")
async def package_file_onlyoffice_forcesave(
    job_id: UUID,
    template_code: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    settings = get_settings()
    job = await wf._get_job_row(db, job_id)
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    wf.assert_package_editable(job, user)
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    revision_before = file_revision(job.get("template_versions_json"), resolved_code)
    doc_key = document_key(job_id, resolved_code, revision_before)
    try:
        result = await trigger_onlyoffice_forcesave(settings, doc_key)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Enregistrement ONLYOFFICE impossible : {exc}",
        ) from exc
    error_code = int(result.get("error", 3))
    if error_code not in (0, 4):
        return {"error": error_code, "revision": revision_before, "saved": False}

    for _ in range(45):
        await asyncio.sleep(1)
        fresh = await wf._get_job_row(db, job_id)
        revision_after = file_revision(fresh.get("template_versions_json"), resolved_code)
        if revision_after > revision_before:
            return {"error": 0, "revision": revision_after, "saved": True}

    return {
        "error": error_code,
        "revision": revision_before,
        "saved": False,
        "timeout": True,
    }


@router.get("/{job_id}/files/{template_code:path}/onlyoffice-file")
async def package_file_onlyoffice(
    job_id: UUID,
    template_code: str,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    if not verify_access_token(settings, job_id, resolved_code, "file", token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Jeton ONLYOFFICE invalide")

    job = await wf._get_job_row(db, job_id)
    storage_key, filename = resolve_package_file(job, resolved_code)
    try:
        data = download_package_file_bytes(settings, storage_key)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du stockage.",
        ) from exc

    return Response(
        content=data,
        media_type=content_type_for_filename(filename),
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


@router.get("/{job_id}/files/{template_code:path}/download")
async def package_file_download(
    job_id: UUID,
    template_code: str,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    settings = get_settings()
    job = await wf._get_job_row(db, job_id)
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    storage_key, filename = resolve_package_file(job, resolved_code)
    try:
        data = download_package_file_bytes(settings, storage_key)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du stockage.",
        ) from exc
    return Response(
        content=data,
        media_type=content_type_for_filename(filename),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    )


@router.post("/{job_id}/files/{template_code:path}/onlyoffice-callback")
async def package_file_onlyoffice_callback(
    job_id: UUID,
    template_code: str,
    request: Request,
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    settings = get_settings()
    resolved_code = await wf.resolve_template_code(db, job_id, template_code)
    if not verify_access_token(settings, job_id, resolved_code, "callback", token):
        return JSONResponse({"error": 1}, status_code=status.HTTP_403_FORBIDDEN)

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": 1})

    if not isinstance(body, dict):
        return JSONResponse({"error": 1})

    job = await wf._get_job_row(db, job_id)
    if job["status"] != "completed":
        return JSONResponse({"error": 1}, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    wf_status = job.get("workflow_status") or "generated"
    if wf_status not in wf.EDITABLE_PACKAGE:
        return JSONResponse({"error": 1})

    try:
        result = await handle_package_file_callback(
            db,
            settings,
            job,
            resolved_code,
            body,
            rebuild_zip=False,
        )
        asyncio.create_task(rebuild_job_zip_for_id(job_id))
        return JSONResponse(result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enregistrement ONLYOFFICE impossible : {exc}",
        ) from exc


@router.post("/{job_id}/procedure/complete", response_model=WorkflowStateResponse)
async def complete_procedure(
    job_id: UUID,
    payload: CompleteProcedurePayload,
    user: AuthenticatedUser = Depends(require_can_review_procedure),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.complete_procedure(db, job_id, user, payload.validator_id)
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/procedure/reject", response_model=WorkflowStateResponse)
async def reject_procedure(
    job_id: UUID,
    payload: RejectPayload,
    user: AuthenticatedUser = Depends(require_can_review_procedure),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.reject_procedure(db, job_id, user, payload.comment)
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/validator/approve", response_model=WorkflowStateResponse)
async def validator_approve(
    job_id: UUID,
    user: AuthenticatedUser = Depends(require_can_validate_final),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.approve_validator(db, job_id, user)
    return WorkflowStateResponse(**state)


@router.post("/{job_id}/validator/reject", response_model=WorkflowStateResponse)
async def validator_reject(
    job_id: UUID,
    payload: RejectPayload,
    user: AuthenticatedUser = Depends(require_can_validate_final),
    db: AsyncSession = Depends(get_db),
) -> WorkflowStateResponse:
    state = await wf.reject_validator(db, job_id, user, payload.comment)
    return WorkflowStateResponse(**state)


@router.get("/{job_id}/workflow/history", response_model=list)
async def workflow_history(
    job_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    return await wf.get_workflow_history(db, job_id)


@router.get("/{job_id}/delivery-mailto", response_model=DeliveryMailtoResponse)
async def delivery_mailto(
    job_id: UUID,
    user: AuthenticatedUser = Depends(require_can_validate_final),
    db: AsyncSession = Depends(get_db),
) -> DeliveryMailtoResponse:
    job = await wf.get_workflow_state(db, job_id)
    if job["workflow_status"] != "approved":
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Le paquet doit être approuvé avant livraison",
        )
    settings = get_settings()
    full_job = await wf._get_job_row(db, job_id)
    mailto = wf.build_delivery_mailto(full_job, app_public_url=settings.app_public_url)
    meta = full_job.get("metadata_json") or {}
    email = (
        full_job.get("national_responsible_email")
        or meta.get("national_responsible_email")
        or meta.get("responsible_email")
        or ""
    ).strip()
    project = full_job.get("project_number") or "projet"
    return DeliveryMailtoResponse(
        mailto_url=mailto,
        recipient_email=email,
        subject=f"[TIP] Paquet documentaire approuvé — {project}",
    )

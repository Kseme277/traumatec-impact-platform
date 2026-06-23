"""Workflow de validation des paquets documentaires."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tip_common.notifications import create_notification, notify_users_with_role
from tip_common.roles import can_review_procedure, can_submit_packages, can_validate_final

WORKFLOW_STATUSES = frozenset(
    {
        "generated",
        "submitted",
        "under_procedure_review",
        "procedure_rejected",
        "procedure_approved",
        "under_final_validation",
        "validator_rejected",
        "approved",
    }
)

SUBMITTABLE = frozenset({"generated", "procedure_rejected", "validator_rejected"})

_SKIP_TRACE_FILES = frozenset({"00_README.txt"})


def trace_package_files(trace: dict[str, Any] | str | None) -> list[dict[str, Any]]:
    """Extrait la liste des fichiers d'un job (y compris anciennes générations sans clé files)."""
    if not trace:
        return []
    if isinstance(trace, str):
        trace = json.loads(trace)

    files = trace.get("files") or []
    if files:
        return files

    codes = trace.get("template_codes") or []
    if codes:
        return [
            {
                "template_id": None,
                "template_code": code,
                "file_path": code,
            }
            for code in codes
        ]

    prefix = trace.get("dossier_prefix") or ""
    artifacts = trace.get("artifacts") or []
    out: list[dict[str, Any]] = []
    for storage_key in artifacts:
        if prefix and not str(storage_key).startswith(prefix):
            continue
        arcname = str(storage_key)[len(prefix) :] if prefix else str(storage_key).rsplit("/", 1)[-1]
        if not arcname or arcname in _SKIP_TRACE_FILES or arcname.endswith("_manifest.json"):
            continue
        if arcname.lower().endswith(".zip"):
            continue
        out.append(
            {
                "template_id": None,
                "template_code": arcname,
                "file_path": arcname,
            }
        )
    return out


def _actor_name(user) -> str:
    return f"{user.prenom} {user.nom}".strip()


async def _get_job_row(db: AsyncSession, job_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        text(
            """
            SELECT j.*, e.title AS event_title, e.project_number,
                   COALESCE(e.national_responsible_email, nc.email) AS national_responsible_email,
                   COALESCE(e.national_responsible_name, nc.full_name) AS national_responsible_name,
                   e.responsible_person, e.metadata_json
            FROM docgen.generation_jobs j
            JOIN events.events e ON e.id = j.event_id
            LEFT JOIN events.national_contacts nc
              ON nc.is_active = true
             AND LOWER(TRIM(nc.full_name)) = LOWER(TRIM(e.responsible_person))
            WHERE j.id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )
    row = result.mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job introuvable")
    return dict(row)


async def _append_step(
    db: AsyncSession,
    *,
    job_id: UUID,
    step: str,
    action: str,
    actor_id: int | None,
    actor_name: str | None,
    comment: str | None = None,
) -> None:
    await db.execute(
        text(
            """
            INSERT INTO docgen.package_workflow_steps
                (generation_job_id, step, action, actor_id, actor_name, comment)
            VALUES (:job_id, :step, :action, :actor_id, :actor_name, :comment)
            """
        ),
        {
            "job_id": str(job_id),
            "step": step,
            "action": action,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "comment": comment,
        },
    )


async def _ensure_file_reviews(db: AsyncSession, job: dict[str, Any]) -> list[dict[str, Any]]:
    trace = job.get("template_versions_json") or {}
    files = trace_package_files(trace)

    for item in files:
        await db.execute(
            text(
                """
                INSERT INTO docgen.package_file_reviews
                    (generation_job_id, template_id, template_code, file_path)
                VALUES (:job_id, :template_id, :template_code, :file_path)
                ON CONFLICT (generation_job_id, template_code) DO NOTHING
                """
            ),
            {
                "job_id": str(job["id"]),
                "template_id": str(item["template_id"]) if item.get("template_id") else None,
                "template_code": item["template_code"],
                "file_path": item.get("file_path"),
            },
        )

    result = await db.execute(
        text(
            """
            SELECT id, generation_job_id, template_id, template_code, file_path,
                   status, comment, reviewed_by_id, reviewed_at, created_at
            FROM docgen.package_file_reviews
            WHERE generation_job_id = :job_id
            ORDER BY template_code
            """
        ),
        {"job_id": str(job["id"])},
    )
    return [dict(row) for row in result.mappings().all()]


async def submit_job(db: AsyncSession, job_id: UUID, user) -> dict[str, Any]:
    if not can_submit_packages(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Soumission non autorisée")

    job = await _get_job_row(db, job_id)
    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    if job["workflow_status"] not in SUBMITTABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Soumission impossible depuis l'état {job['workflow_status']}",
        )

    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET workflow_status = 'submitted', assigned_reviewer_id = NULL
            WHERE id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="submitted",
        action="submit",
        actor_id=user.id,
        actor_name=_actor_name(user),
    )
    title = f"Paquet soumis — {job.get('project_number') or job.get('event_title')}"
    body = f"{_actor_name(user)} a soumis un paquet pour contrôle procédure."
    link = f"/workflow/controle?job={job_id}"
    await notify_users_with_role(
        db,
        role="controle_procedure",
        type="workflow.submitted",
        title=title,
        body=body,
        link=link,
        payload={"job_id": str(job_id), "event_id": str(job["event_id"])},
        exclude_user_id=user.id,
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def assign_reviewer(db: AsyncSession, job_id: UUID, user, reviewer_id: int | None) -> dict[str, Any]:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assignation non autorisée")

    job = await _get_job_row(db, job_id)
    if job["workflow_status"] not in ("submitted", "under_procedure_review"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="État incompatible pour assignation")

    target_id = reviewer_id or user.id
    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET workflow_status = 'under_procedure_review',
                assigned_reviewer_id = :reviewer_id
            WHERE id = :job_id
            """
        ),
        {"job_id": str(job_id), "reviewer_id": target_id},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="under_procedure_review",
        action="assign_reviewer",
        actor_id=user.id,
        actor_name=_actor_name(user),
        comment=f"Assigné à l'utilisateur #{target_id}",
    )
    if target_id != user.id:
        await create_notification(
            db,
            user_id=target_id,
            type="workflow.assigned",
            title="Paquet assigné pour contrôle",
            body=f"Un paquet ({job.get('project_number')}) vous est assigné.",
            link=f"/workflow/controle?job={job_id}",
            payload={"job_id": str(job_id)},
        )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def review_file(
    db: AsyncSession,
    job_id: UUID,
    user,
    template_code: str,
    *,
    review_status: str,
    comment: str | None,
) -> dict[str, Any]:
    if review_status not in ("approved", "rejected"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Statut invalide")

    job = await _get_job_row(db, job_id)
    roles = list(user.roles)
    wf_status = job["workflow_status"]

    if wf_status in ("under_procedure_review", "submitted"):
        if not can_review_procedure(roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Revue non autorisée")
        step = "procedure_file_review"
        if wf_status == "submitted":
            await db.execute(
                text(
                    """
                    UPDATE docgen.generation_jobs
                    SET workflow_status = 'under_procedure_review',
                        assigned_reviewer_id = :reviewer_id
                    WHERE id = :job_id
                    """
                ),
                {"job_id": str(job_id), "reviewer_id": user.id},
            )
    elif wf_status == "under_final_validation":
        if not can_validate_final(roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Revue non autorisée")
        step = "validator_file_review"
    else:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Revue fichier non active pour cet état")

    await db.execute(
        text(
            """
            UPDATE docgen.package_file_reviews
            SET status = :status, comment = :comment,
                reviewed_by_id = :user_id, reviewed_at = now()
            WHERE generation_job_id = :job_id AND template_code = :code
            """
        ),
        {
            "status": review_status,
            "comment": comment,
            "user_id": user.id,
            "job_id": str(job_id),
            "code": template_code,
        },
    )
    await _append_step(
        db,
        job_id=job_id,
        step=step,
        action=review_status,
        actor_id=user.id,
        actor_name=_actor_name(user),
        comment=f"{template_code}: {comment or ''}".strip(),
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def complete_procedure(db: AsyncSession, job_id: UUID, user) -> dict[str, Any]:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contrôle non autorisé")

    job = await _get_job_row(db, job_id)
    files = await _ensure_file_reviews(db, job)
    if not files:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Aucun fichier à valider")
    if any(f["status"] == "pending" for f in files):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tous les fichiers doivent être revus")
    if any(f["status"] == "rejected" for f in files):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Des fichiers sont rejetés")

    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET workflow_status = 'under_final_validation'
            WHERE id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )
    await db.execute(
        text(
            """
            UPDATE docgen.package_file_reviews
            SET status = 'pending', comment = NULL,
                reviewed_by_id = NULL, reviewed_at = NULL
            WHERE generation_job_id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="procedure_approved",
        action="complete",
        actor_id=user.id,
        actor_name=_actor_name(user),
    )
    title = f"Validation finale requise — {job.get('project_number')}"
    await notify_users_with_role(
        db,
        role="validateur",
        type="workflow.procedure_approved",
        title=title,
        body="Un paquet a passé le contrôle procédure et attend validation finale.",
        link=f"/workflow/validation?job={job_id}",
        payload={"job_id": str(job_id)},
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def reject_procedure(db: AsyncSession, job_id: UUID, user, comment: str) -> dict[str, Any]:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rejet non autorisé")

    job = await _get_job_row(db, job_id)
    await db.execute(
        text(
            "UPDATE docgen.generation_jobs SET workflow_status = 'procedure_rejected' WHERE id = :job_id"
        ),
        {"job_id": str(job_id)},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="procedure_rejected",
        action="reject",
        actor_id=user.id,
        actor_name=_actor_name(user),
        comment=comment,
    )
    await create_notification(
        db,
        user_id=job["requested_by_id"],
        type="workflow.procedure_rejected",
        title=f"Paquet rejeté (contrôle) — {job.get('project_number')}",
        body=comment,
        link=f"/documents/generation?event={job['event_id']}",
        payload={"job_id": str(job_id)},
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def approve_validator(db: AsyncSession, job_id: UUID, user) -> dict[str, Any]:
    if not can_validate_final(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Validation non autorisée")

    job = await _get_job_row(db, job_id)
    if job["workflow_status"] != "under_final_validation":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="État incompatible")

    files = await _ensure_file_reviews(db, job)
    if not files:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Aucun fichier à valider")
    if any(f["status"] == "pending" for f in files):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tous les fichiers doivent être revus avant approbation",
        )
    if any(f["status"] == "rejected" for f in files):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Des fichiers sont rejetés — corrigez ou rejetez le paquet",
        )

    await db.execute(
        text("UPDATE docgen.generation_jobs SET workflow_status = 'approved' WHERE id = :job_id"),
        {"job_id": str(job_id)},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="approved",
        action="validator_approve",
        actor_id=user.id,
        actor_name=_actor_name(user),
    )
    await create_notification(
        db,
        user_id=job["requested_by_id"],
        type="workflow.approved",
        title=f"Paquet approuvé — {job.get('project_number')}",
        body="Validation finale accordée. Vous pouvez déclencher la livraison.",
        link=f"/workflow/validation?job={job_id}",
        payload={"job_id": str(job_id)},
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def reject_validator(db: AsyncSession, job_id: UUID, user, comment: str) -> dict[str, Any]:
    if not can_validate_final(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rejet non autorisé")

    job = await _get_job_row(db, job_id)
    await db.execute(
        text("UPDATE docgen.generation_jobs SET workflow_status = 'validator_rejected' WHERE id = :job_id"),
        {"job_id": str(job_id)},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="validator_rejected",
        action="reject",
        actor_id=user.id,
        actor_name=_actor_name(user),
        comment=comment,
    )
    await create_notification(
        db,
        user_id=job["requested_by_id"],
        type="workflow.validator_rejected",
        title=f"Paquet rejeté (validateur) — {job.get('project_number')}",
        body=comment,
        link=f"/documents/generation?event={job['event_id']}",
        payload={"job_id": str(job_id)},
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def get_workflow_history(db: AsyncSession, job_id: UUID) -> list[dict[str, Any]]:
    result = await db.execute(
        text(
            """
            SELECT id, generation_job_id, step, action, actor_id, actor_name, comment, created_at
            FROM docgen.package_workflow_steps
            WHERE generation_job_id = :job_id
            ORDER BY created_at ASC
            """
        ),
        {"job_id": str(job_id)},
    )
    return [dict(row) for row in result.mappings().all()]


async def get_workflow_state(db: AsyncSession, job_id: UUID) -> dict[str, Any]:
    job = await _get_job_row(db, job_id)
    files = await _ensure_file_reviews(db, job)
    history = await get_workflow_history(db, job_id)
    return {
        "job_id": job["id"],
        "event_id": job["event_id"],
        "event_title": job.get("event_title"),
        "project_number": job.get("project_number"),
        "status": job["status"],
        "workflow_status": job["workflow_status"],
        "assigned_reviewer_id": job.get("assigned_reviewer_id"),
        "assigned_validator_id": job.get("assigned_validator_id"),
        "requested_by_id": job["requested_by_id"],
        "zip_filename": job.get("zip_filename"),
        "files": files,
        "history": history,
    }


async def list_workflow_queue(
    db: AsyncSession,
    *,
    role_filter: str,
    user_id: int,
    limit: int = 50,
    queue_scope: str = "pending",
) -> list[dict[str, Any]]:
    if role_filter == "controle":
        statuses = ("submitted", "under_procedure_review", "procedure_rejected")
    elif role_filter == "validateur":
        if queue_scope == "delivery":
            statuses = ("approved",)
        else:
            statuses = ("under_final_validation", "validator_rejected")
    elif role_filter == "support":
        statuses = (
            "generated",
            "submitted",
            "procedure_rejected",
            "validator_rejected",
            "under_procedure_review",
            "under_final_validation",
        )
    else:
        statuses = tuple(WORKFLOW_STATUSES)

    result = await db.execute(
        text(
            """
            SELECT j.id, j.event_id, j.workflow_status, j.status, j.zip_filename,
                   j.created_at, j.completed_at, j.requested_by_id,
                   j.assigned_reviewer_id, e.title AS event_title, e.project_number
            FROM docgen.generation_jobs j
            JOIN events.events e ON e.id = j.event_id
            WHERE j.status = 'completed'
              AND j.workflow_status = ANY(:statuses)
            ORDER BY j.completed_at DESC NULLS LAST
            LIMIT :limit
            """
        ),
        {"statuses": list(statuses), "limit": limit},
    )
    return [dict(row) for row in result.mappings().all()]


async def workflow_stats(db: AsyncSession, *, role_filter: str, user_id: int) -> dict[str, int]:
    base = """
        SELECT workflow_status, COUNT(*)::int AS cnt
        FROM docgen.generation_jobs
        WHERE status = 'completed'
        GROUP BY workflow_status
    """
    result = await db.execute(text(base))
    counts = {row.workflow_status: row.cnt for row in result.fetchall()}

    assigned = 0
    if role_filter == "controle":
        r = await db.execute(
            text(
                """
                SELECT COUNT(*)::int FROM docgen.generation_jobs
                WHERE status = 'completed'
                  AND workflow_status = 'under_procedure_review'
                  AND assigned_reviewer_id = :uid
                """
            ),
            {"uid": user_id},
        )
        assigned = int(r.scalar_one())

    return {
        "generated": counts.get("generated", 0),
        "submitted": counts.get("submitted", 0),
        "under_procedure_review": counts.get("under_procedure_review", 0),
        "procedure_rejected": counts.get("procedure_rejected", 0),
        "procedure_approved": counts.get("procedure_approved", 0),
        "under_final_validation": counts.get("under_final_validation", 0),
        "validator_rejected": counts.get("validator_rejected", 0),
        "approved": counts.get("approved", 0),
        "assigned_to_me": assigned,
    }


def build_delivery_mailto(job: dict[str, Any], *, app_public_url: str) -> str:
    meta = job.get("metadata_json") or {}
    if isinstance(meta, str):
        meta = json.loads(meta)
    email = (
        job.get("national_responsible_email")
        or meta.get("national_responsible_email")
        or meta.get("responsible_email")
        or ""
    ).strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Email du responsable national manquant. "
                "Renseignez-le sur la fiche événement ou dans Administration → Référentiels."
            ),
        )

    project = job.get("project_number") or "projet"
    title = job.get("event_title") or project
    download_url = f"{app_public_url.rstrip('/')}/documents/generation?event={job['event_id']}"
    subject = f"[TIP] Paquet documentaire approuvé — {project}"
    body = (
        f"Bonjour,\n\n"
        f"Le paquet documentaire pour l'événement « {title} » ({project}) a été validé.\n\n"
        f"Téléchargement : {download_url}\n\n"
        f"Cordialement,\nTraumatec Impact Platform"
    )
    return f"mailto:{quote(email)}?subject={quote(subject)}&body={quote(body)}"

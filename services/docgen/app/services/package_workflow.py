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
from tip_common.event_scope import assert_event_access
from tip_common.workflow_deadlines import compute_phase_due_at, is_phase_overdue

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
EDITABLE_PACKAGE = SUBMITTABLE

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


def assert_package_editable(job: dict[str, Any], user) -> None:
    assert_event_access(user, job.get("organizer_responsible_user_id"))
    if not can_submit_packages(list(user.roles)) and not getattr(user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Modification non autorisée")
    wf = job.get("workflow_status") or "generated"
    if wf not in EDITABLE_PACKAGE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Modification impossible depuis l'état {wf}",
        )


async def _set_workflow_phase(
    db: AsyncSession,
    job_id: UUID,
    workflow_status: str,
    *,
    extra_sql: str = "",
    extra_params: dict[str, Any] | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    due = compute_phase_due_at(workflow_status, from_time=now)
    params: dict[str, Any] = {
        "job_id": str(job_id),
        "status": workflow_status,
        "started": now,
        "due": due,
    }
    if extra_params:
        params.update(extra_params)
    sets = "workflow_status = :status, phase_started_at = :started, phase_due_at = :due"
    if extra_sql:
        sets = f"{sets}, {extra_sql}"
    await db.execute(
        text(f"UPDATE docgen.generation_jobs SET {sets} WHERE id = :job_id"),
        params,
    )


def _support_scope_sql(role_filter: str, user_id: int) -> tuple[str, dict[str, Any]]:
    if role_filter != "support":
        return "", {}
    return (
        " AND (e.organizer_responsible_user_id = :scope_uid OR j.requested_by_id = :scope_uid)",
        {"scope_uid": user_id},
    )


async def _get_job_row(db: AsyncSession, job_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        text(
            """
            SELECT j.*, e.title AS event_title, e.project_number,
                   e.organizer_responsible_user_id,
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


async def _validate_validator_user(db: AsyncSession, validator_id: int) -> None:
    validator = await db.execute(
        text(
            """
            SELECT u.id FROM identity.utilisateurs u
            JOIN identity.user_roles ur ON ur.user_id = u.id
            WHERE u.id = :id
              AND ur.role IN ('validateur', 'administrateur')
              AND u.est_actif = TRUE
            """
        ),
        {"id": validator_id},
    )
    if validator.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Validateur invalide ou inactif",
        )


async def submit_job(db: AsyncSession, job_id: UUID, user, reviewer_id: int) -> dict[str, Any]:
    if not can_submit_packages(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Soumission non autorisée")

    job = await _get_job_row(db, job_id)
    assert_event_access(user, job.get("organizer_responsible_user_id"))

    if job["status"] != "completed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Paquet non généré")
    if job["workflow_status"] not in SUBMITTABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Soumission impossible depuis l'état {job['workflow_status']}",
        )

    reviewer = await db.execute(
        text(
            """
            SELECT u.id FROM identity.utilisateurs u
            JOIN identity.user_roles ur ON ur.user_id = u.id
            WHERE u.id = :id AND ur.role = 'controle_procedure' AND u.est_actif = TRUE
            """
        ),
        {"id": reviewer_id},
    )
    if reviewer.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Contrôleur procédure invalide ou inactif",
        )

    if job["workflow_status"] in ("procedure_rejected", "validator_rejected"):
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

    await _set_workflow_phase(
        db,
        job_id,
        "under_procedure_review",
        extra_sql="assigned_reviewer_id = :reviewer_id",
        extra_params={"reviewer_id": reviewer_id},
    )
    await _append_step(
        db,
        job_id=job_id,
        step="under_procedure_review",
        action="submit",
        actor_id=user.id,
        actor_name=_actor_name(user),
        comment=f"Assigné au contrôleur #{reviewer_id}",
    )
    title = f"Paquet assigné — {job.get('project_number') or job.get('event_title')}"
    body = f"{_actor_name(user)} vous a assigné un paquet pour contrôle procédure."
    await create_notification(
        db,
        user_id=reviewer_id,
        type="workflow.assigned",
        title=title,
        body=body,
        link=f"/workflow/controle?job={job_id}",
        payload={"job_id": str(job_id), "event_id": str(job["event_id"])},
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
    await _set_workflow_phase(
        db,
        job_id,
        "under_procedure_review",
        extra_sql="assigned_reviewer_id = :reviewer_id",
        extra_params={"reviewer_id": target_id},
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
            await _set_workflow_phase(
                db,
                job_id,
                "under_procedure_review",
                extra_sql="assigned_reviewer_id = :reviewer_id",
                extra_params={"reviewer_id": user.id},
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
            SET status = :status, comment = COALESCE(:comment, comment),
                reviewed_by_id = :user_id, reviewed_at = now()
            WHERE generation_job_id = :job_id AND template_code = :code
            """
        ),
        {
            "status": review_status,
            "comment": comment.strip() if comment and comment.strip() else None,
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


async def save_file_comment(
    db: AsyncSession,
    job_id: UUID,
    user,
    template_code: str,
    *,
    comment: str | None,
) -> dict[str, Any]:
    job = await _get_job_row(db, job_id)
    roles = list(user.roles)
    wf_status = job["workflow_status"]

    if wf_status in ("under_procedure_review", "submitted"):
        if not can_review_procedure(roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Revue non autorisée")
    elif wf_status == "under_final_validation":
        if not can_validate_final(roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Revue non autorisée")
    else:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Remarque fichier non modifiable pour cet état")

    result = await db.execute(
        text(
            """
            UPDATE docgen.package_file_reviews
            SET comment = :comment
            WHERE generation_job_id = :job_id AND template_code = :code
            RETURNING id
            """
        ),
        {
            "comment": comment.strip() if comment else None,
            "job_id": str(job_id),
            "code": template_code,
        },
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable dans le paquet")
    await db.commit()
    return await get_workflow_state(db, job_id)


async def complete_procedure(
    db: AsyncSession,
    job_id: UUID,
    user,
    validator_id: int,
) -> dict[str, Any]:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contrôle non autorisé")

    await _validate_validator_user(db, validator_id)

    job = await _get_job_row(db, job_id)
    files = await _ensure_file_reviews(db, job)
    if not files:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Aucun fichier à valider")
    if any(f["status"] == "pending" for f in files):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tous les fichiers doivent être revus")
    if any(f["status"] == "rejected" for f in files):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Des fichiers sont rejetés")

    await _set_workflow_phase(
        db,
        job_id,
        "under_final_validation",
        extra_sql="assigned_validator_id = :validator_id",
        extra_params={"validator_id": validator_id},
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
        comment=f"Assigné au validateur #{validator_id}",
    )
    title = f"Validation finale requise — {job.get('project_number')}"
    await create_notification(
        db,
        user_id=validator_id,
        type="workflow.procedure_approved",
        title=title,
        body="Un paquet a passé le contrôle procédure et attend votre validation finale.",
        link=f"/workflow/validation?job={job_id}",
        payload={"job_id": str(job_id), "event_id": str(job["event_id"])},
    )
    await db.commit()
    return await get_workflow_state(db, job_id)


async def reject_procedure(db: AsyncSession, job_id: UUID, user, comment: str) -> dict[str, Any]:
    if not can_review_procedure(list(user.roles)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rejet non autorisé")

    job = await _get_job_row(db, job_id)
    await _set_workflow_phase(db, job_id, "procedure_rejected")
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

    await _set_workflow_phase(db, job_id, "approved")
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
    await _set_workflow_phase(db, job_id, "validator_rejected")
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
    due_at = job.get("phase_due_at")
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
        "phase_started_at": job.get("phase_started_at"),
        "phase_due_at": due_at,
        "is_overdue": is_phase_overdue(due_at),
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
        statuses = ("submitted", "under_procedure_review")
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

    scope_sql, scope_params = _support_scope_sql(role_filter, user_id)
    if role_filter == "validateur" and queue_scope != "delivery":
        scope_sql += """
              AND (
                j.assigned_validator_id IS NULL
                OR j.assigned_validator_id = :validator_uid
                OR EXISTS (
                  SELECT 1 FROM identity.user_roles ur
                  WHERE ur.user_id = :validator_uid AND ur.role = 'administrateur'
                )
              )
        """
        scope_params["validator_uid"] = user_id
    params: dict[str, Any] = {"statuses": list(statuses), "limit": limit, **scope_params}

    result = await db.execute(
        text(
            f"""
            SELECT j.id, j.event_id, j.workflow_status, j.status, j.zip_filename,
                   j.created_at, j.completed_at, j.requested_by_id,
                   j.assigned_reviewer_id, j.phase_started_at, j.phase_due_at,
                   e.title AS event_title, e.project_number,
                   e.organizer_responsible_user_id,
                   CASE WHEN j.phase_due_at IS NOT NULL AND j.phase_due_at < now() THEN TRUE ELSE FALSE END AS is_overdue
            FROM docgen.generation_jobs j
            JOIN events.events e ON e.id = j.event_id
            WHERE j.status = 'completed'
              AND j.workflow_status = ANY(:statuses)
              {scope_sql}
            ORDER BY j.phase_due_at ASC NULLS LAST, j.completed_at DESC NULLS LAST
            LIMIT :limit
            """
        ),
        params,
    )
    return [dict(row) for row in result.mappings().all()]


async def workflow_stats(db: AsyncSession, *, role_filter: str, user_id: int) -> dict[str, int]:
    scope_sql, scope_params = _support_scope_sql(role_filter, user_id)
    base = f"""
        WITH latest AS (
            SELECT DISTINCT ON (j.event_id)
                   j.event_id, j.workflow_status, j.phase_due_at
            FROM docgen.generation_jobs j
            JOIN events.events e ON e.id = j.event_id
            WHERE j.status = 'completed'
            {scope_sql}
            ORDER BY j.event_id, j.completed_at DESC NULLS LAST, j.created_at DESC
        )
        SELECT workflow_status, COUNT(*)::int AS cnt
        FROM latest
        GROUP BY workflow_status
    """
    result = await db.execute(text(base), scope_params)
    counts = {row.workflow_status: row.cnt for row in result.fetchall()}

    overdue_result = await db.execute(
        text(
            f"""
            WITH latest AS (
                SELECT DISTINCT ON (j.event_id)
                       j.event_id, j.phase_due_at
                FROM docgen.generation_jobs j
                JOIN events.events e ON e.id = j.event_id
                WHERE j.status = 'completed'
                {scope_sql}
                ORDER BY j.event_id, j.completed_at DESC NULLS LAST, j.created_at DESC
            )
            SELECT COUNT(*)::int FROM latest
            WHERE phase_due_at IS NOT NULL AND phase_due_at < now()
            """
        ),
        scope_params,
    )
    overdue = int(overdue_result.scalar_one())

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
        "overdue": overdue,
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

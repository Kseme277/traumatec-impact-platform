from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.generation_job import GenerationJob
from app.schemas.generation import (
    GenerationJobResponse,
    GenerationNotificationResponse,
    GenerationStartResponse,
)
from tip_common.security import AuthenticatedUser, get_current_user, require_can_generate
from tip_common.event_scope import assert_event_access, scopes_events_to_organizer
from tip_common.storage import get_object_storage

router = APIRouter()


@router.get("/recent", response_model=list[GenerationNotificationResponse])
async def recent_generations(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 30,
    platform: bool = Query(default=False),
) -> list[GenerationNotificationResponse]:
    """Dernières générations DocGen — utilisateur courant ou plateforme (admin / support)."""
    cap = min(max(limit, 1), 100)
    scoped_support = scopes_events_to_organizer(user)
    if scoped_support:
        where_sql = "WHERE e.organizer_responsible_user_id = :user_id"
        params: dict = {"limit": cap, "user_id": user.id}
    elif platform and (user.is_admin or "support_administratif" in user.roles):
        where_sql = ""
        params = {"limit": cap}
    else:
        where_sql = "WHERE j.requested_by_id = :user_id"
        params = {"limit": cap, "user_id": user.id}

    result = await db.execute(
        text(
            f"""
            SELECT j.id, j.event_id, j.status, j.workflow_status, j.zip_filename, j.error_message,
                   j.created_at, j.completed_at, j.phase_due_at,
                   CASE WHEN j.phase_due_at IS NOT NULL AND j.phase_due_at < now() THEN TRUE ELSE FALSE END AS is_overdue,
                   e.title AS event_title
            FROM docgen.generation_jobs j
            LEFT JOIN events.events e ON e.id = j.event_id
            {where_sql}
            ORDER BY COALESCE(j.completed_at, j.created_at) DESC
            LIMIT :limit
            """
        ),
        params,
    )
    rows = result.mappings().all()
    return [
        GenerationNotificationResponse(
            id=row["id"],
            event_id=row["event_id"],
            event_title=row["event_title"],
            status=row["status"],
            workflow_status=row["workflow_status"],
            zip_filename=row["zip_filename"],
            error_message=row["error_message"],
            created_at=row["created_at"],
            completed_at=row["completed_at"],
        )
        for row in rows
    ]


@router.get("/events/{event_id}/history", response_model=list[GenerationJobResponse])
async def generation_history(
    event_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GenerationJob]:
    result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.event_id == event_id)
        .order_by(GenerationJob.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/events/{event_id}", response_model=GenerationStartResponse)
async def start_generation(
    event_id: UUID,
    user: AuthenticatedUser = Depends(require_can_generate),
    db: AsyncSession = Depends(get_db),
) -> GenerationStartResponse:
    event_row = await db.execute(
        text(
            """
            SELECT preparation_theme, project_number, title,
                   start_date::text, end_date::text,
                   organizer_responsible_user_id
            FROM events.events
            WHERE id = :id
            """
        ),
        {"id": str(event_id)},
    )
    event = event_row.one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    assert_event_access(user, event.organizer_responsible_user_id)

    ref_raw = event.end_date or event.start_date
    if not ref_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dates manquantes. Renseignez la date de début et de fin sur la fiche événement.",
        )
    ref = date.fromisoformat(str(ref_raw)[:10])
    if ref < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Événement déjà passé. Seuls les événements à venir peuvent être générés.",
        )

    theme = event.preparation_theme
    if not theme or theme not in ("operatory", "pbo", "iec"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Thème de préparation requis (PBO, Operatory ou IEC). "
                "Renseignez-le sur la fiche événement ou depuis la page de génération."
            ),
        )

    approved = await db.execute(
        text(
            """
            SELECT id FROM docgen.generation_jobs
            WHERE event_id = :event_id
              AND status = 'completed'
              AND workflow_status = 'approved'
            LIMIT 1
            """
        ),
        {"event_id": str(event_id)},
    )
    if approved.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Un paquet validé existe déjà pour cet événement. "
                "Une nouvelle génération n'est pas autorisée."
            ),
        )

    latest_wf = await db.execute(
        text(
            """
            SELECT workflow_status
            FROM docgen.generation_jobs
            WHERE event_id = :event_id AND status = 'completed'
            ORDER BY completed_at DESC NULLS LAST, created_at DESC
            LIMIT 1
            """
        ),
        {"event_id": str(event_id)},
    )
    latest_row = latest_wf.one_or_none()
    if latest_row:
        wf = str(latest_row.workflow_status or "generated")
        if wf in {
            "submitted",
            "under_procedure_review",
            "under_final_validation",
            "procedure_rejected",
            "validator_rejected",
        }:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Génération impossible : le paquet est en validation ou a été rejeté. "
                    "Corrigez la fiche et soumettez à nouveau le paquet existant."
                ),
            )
        if wf != "generated":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Génération impossible pour l'état actuel du paquet.",
            )

    job = GenerationJob(
        event_id=event_id,
        requested_by_id=user.id,
        status="queued",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        from redis import Redis
        from rq import Queue

        from app.services.docgen.pipeline import run_docgen_job

        settings = get_settings()
        redis = Redis.from_url(settings.redis_url)
        queue = Queue(settings.rq_queue_name, connection=redis)
        queue.enqueue(run_docgen_job, str(job.id), job_timeout=600)
    except Exception as exc:
        job.status = "failed"
        job.error_message = f"File d'attente indisponible : {exc}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=job.error_message,
        ) from exc

    return GenerationStartResponse(
        job_id=job.id,
        status=job.status,
        message="Génération du paquet documentaire en cours.",
    )


@router.get("/{job_id}", response_model=GenerationJobResponse)
async def get_generation_status(
    job_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GenerationJob:
    job = await db.get(GenerationJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job introuvable")
    return job


@router.get("/{job_id}/download")
async def download_zip(
    job_id: UUID,
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    job = await db.get(GenerationJob, job_id)
    if job is None or job.status != "completed" or not job.zip_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ZIP non disponible (expiré ou non généré). L'historique reste consultable.",
        )

    storage = get_object_storage(get_settings())
    data = storage.download_bytes(job.zip_path)
    filename = job.zip_filename or "paquet.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

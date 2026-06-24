from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.teacher import Teacher
from app.schemas.teacher import (
    TeacherCreate,
    TeacherListResponse,
    TeacherResponse,
    TeacherSyncFromParticipantsResult,
    TeacherUpdate,
)
from app.services.teacher_sync import sync_all_enseignants_from_participants
from tip_common.audit import record_audit_event
from tip_common.security import AuthenticatedUser, get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=TeacherListResponse)
async def list_teachers(
    _: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(default=True),
    q: str | None = Query(default=None),
) -> TeacherListResponse:
    query = select(Teacher).order_by(Teacher.last_name, Teacher.first_name)
    count_query = select(func.count()).select_from(Teacher)
    if active_only:
        query = query.where(Teacher.is_active.is_(True))
        count_query = count_query.where(Teacher.is_active.is_(True))
    if q:
        pattern = f"%{q.strip()}%"
        filt = (
            Teacher.first_name.ilike(pattern)
            | Teacher.last_name.ilike(pattern)
            | Teacher.email.ilike(pattern)
        )
        query = query.where(filt)
        count_query = count_query.where(filt)
    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query)).scalars().all()
    return TeacherListResponse(
        items=[TeacherResponse.model_validate(t) for t in items],
        total=total,
    )


@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreate,
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Teacher:
    teacher = Teacher(**payload.model_dump())
    db.add(teacher)
    await db.flush()
    await record_audit_event(
        db,
        actor_id=user.id,
        action="teacher.create",
        entity_type="teacher",
        entity_id=str(teacher.id),
        payload={"last_name": teacher.last_name, "first_name": teacher.first_name},
    )
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.patch("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: UUID,
    payload: TeacherUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Teacher:
    teacher = await db.get(Teacher, teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enseignant introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(teacher, key, value)
    await record_audit_event(
        db,
        actor_id=user.id,
        action="teacher.update",
        entity_type="teacher",
        entity_id=str(teacher.id),
        payload={},
    )
    await db.commit()
    await db.refresh(teacher)
    return teacher


@router.post("/sync-from-participants", response_model=TeacherSyncFromParticipantsResult)
async def sync_teachers_from_participants(
    user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TeacherSyncFromParticipantsResult:
    """Migre les enseignants des imports certificats vers le référentiel teachers."""
    stats = await sync_all_enseignants_from_participants(db)
    await record_audit_event(
        db,
        actor_id=user.id,
        action="teacher.sync_from_participants",
        entity_type="teacher",
        entity_id="bulk",
        payload=stats,
    )
    await db.commit()
    return TeacherSyncFromParticipantsResult.model_validate(stats)

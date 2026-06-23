from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps.auth import get_current_utilisateur, require_can_view_users_identity
from app.models.utilisateur import Utilisateur
from app.services.user_roles import load_user_roles
from tip_common.roles import primary_role

router = APIRouter()


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: int
    type: str
    title: str
    body: str
    link: str | None
    payload_json: dict[str, Any] | None = None
    read_at: datetime | None
    created_at: datetime


class UserListItem(BaseModel):
    id: int
    clerk_id: str | None
    username: str | None = None
    email: str
    nom: str
    prenom: str
    phone: str | None = None
    role: str
    roles: list[str]
    est_actif: bool
    created_at: datetime


@router.get("/unread-count")
async def unread_count(
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    result = await db.execute(
        text(
            """
            SELECT COUNT(*)::int FROM identity.notifications
            WHERE user_id = :user_id AND read_at IS NULL
            """
        ),
        {"user_id": utilisateur.id},
    )
    return {"count": int(result.scalar_one())}


@router.api_route("/read-all", methods=["POST", "PATCH"])
async def mark_all_read(
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    result = await db.execute(
        text(
            """
            UPDATE identity.notifications
            SET read_at = now()
            WHERE user_id = :user_id AND read_at IS NULL
            """
        ),
        {"user_id": utilisateur.id},
    )
    await db.commit()
    return {"updated": result.rowcount or 0}


@router.get("/directory", response_model=list[UserListItem])
async def list_users_directory(
    _: Utilisateur = Depends(require_can_view_users_identity),
    db: AsyncSession = Depends(get_db),
) -> list[UserListItem]:
    result = await db.execute(
        text(
            """
            SELECT id, clerk_id, username, email, nom, prenom, phone, role, est_actif, created_at
            FROM identity.utilisateurs
            ORDER BY created_at DESC
            """
        )
    )
    items: list[UserListItem] = []
    for row in result.fetchall():
        roles = await load_user_roles(db, row.id, row.role)
        items.append(
            UserListItem(
                id=row.id,
                clerk_id=row.clerk_id,
                username=row.username,
                email=row.email,
                nom=row.nom,
                prenom=row.prenom,
                phone=row.phone,
                role=primary_role(roles),
                roles=roles,
                est_actif=row.est_actif,
                created_at=row.created_at,
            )
        )
    return items


@router.get("", response_model=list[NotificationResponse])
@router.get("/", response_model=list[NotificationResponse], include_in_schema=False)
async def list_notifications(
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
) -> list[NotificationResponse]:
    sql = """
        SELECT id, user_id, type, title, body, link, payload_json, read_at, created_at
        FROM identity.notifications
        WHERE user_id = :user_id
    """
    if unread_only:
        sql += " AND read_at IS NULL"
    sql += " ORDER BY created_at DESC LIMIT :limit"

    result = await db.execute(text(sql), {"user_id": utilisateur.id, "limit": limit})
    return [NotificationResponse(**dict(row)) for row in result.mappings().all()]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID,
    utilisateur: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    result = await db.execute(
        text(
            """
            UPDATE identity.notifications
            SET read_at = now()
            WHERE id = :id AND user_id = :user_id
            RETURNING id, user_id, type, title, body, link, payload_json, read_at, created_at
            """
        ),
        {"id": str(notification_id), "user_id": utilisateur.id},
    )
    row = result.mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification introuvable")
    await db.commit()
    return NotificationResponse(**dict(row))

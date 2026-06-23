"""Notifications in-app (table identity.notifications)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tip_common.roles import normalize_roles


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    type: str,
    title: str,
    body: str,
    link: str | None = None,
    payload: dict[str, Any] | None = None,
) -> UUID:
    result = await db.execute(
        text(
            """
            INSERT INTO identity.notifications (user_id, type, title, body, link, payload_json)
            VALUES (:user_id, :type, :title, :body, :link, CAST(:payload AS jsonb))
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "link": link,
            "payload": json.dumps(payload or {}),
        },
    )
    return result.scalar_one()


async def notify_users_with_role(
    db: AsyncSession,
    *,
    role: str,
    type: str,
    title: str,
    body: str,
    link: str | None = None,
    payload: dict[str, Any] | None = None,
    exclude_user_id: int | None = None,
) -> int:
    role = normalize_roles([role])[0]
    result = await db.execute(
        text(
            """
            SELECT DISTINCT u.id
            FROM identity.utilisateurs u
            JOIN identity.user_roles ur ON ur.user_id = u.id
            WHERE ur.role = :role AND u.est_actif = TRUE
            """
        ),
        {"role": role},
    )
    user_ids = [row.id for row in result.fetchall() if row.id != exclude_user_id]
    for uid in user_ids:
        await create_notification(
            db,
            user_id=uid,
            type=type,
            title=title,
            body=body,
            link=link,
            payload=payload,
        )
    return len(user_ids)

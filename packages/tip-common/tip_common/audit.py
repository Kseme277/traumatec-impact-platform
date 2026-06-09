"""Journal d'audit partagé (table identity.audit_logs)."""

from __future__ import annotations

import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def record_audit_event(
    db: AsyncSession,
    *,
    actor_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    payload: dict | None = None,
) -> None:
    await db.execute(
        text(
            """
            INSERT INTO identity.audit_logs (actor_id, action, entity_type, entity_id, payload)
            VALUES (:actor_id, :action, :entity_type, :entity_id, CAST(:payload AS jsonb))
            """
        ),
        {
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "payload": json.dumps(payload or {}, ensure_ascii=False),
        },
    )

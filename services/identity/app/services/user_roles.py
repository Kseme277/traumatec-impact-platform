"""Gestion des rôles multiples (identity.user_roles)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tip_common.roles import normalize_roles, primary_role


async def load_user_roles(db: AsyncSession, user_id: int, fallback_role: str | None = None) -> list[str]:
    result = await db.execute(
        text("SELECT role FROM identity.user_roles WHERE user_id = :user_id ORDER BY role"),
        {"user_id": user_id},
    )
    roles = [row.role for row in result.fetchall()]
    return normalize_roles(roles, fallback_role=fallback_role)


async def set_user_roles(db: AsyncSession, user_id: int, roles: list[str]) -> list[str]:
    normalized = normalize_roles(roles)
    await db.execute(
        text("DELETE FROM identity.user_roles WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    for role in normalized:
        await db.execute(
            text(
                """
                INSERT INTO identity.user_roles (user_id, role)
                VALUES (:user_id, :role)
                ON CONFLICT DO NOTHING
                """
            ),
            {"user_id": user_id, "role": role},
        )
    await db.execute(
        text("UPDATE identity.utilisateurs SET role = :role WHERE id = :user_id"),
        {"user_id": user_id, "role": primary_role(normalized)},
    )
    return normalized


async def ensure_user_roles_from_legacy(db: AsyncSession, user_id: int, legacy_role: str) -> list[str]:
    result = await db.execute(
        text("SELECT COUNT(*) FROM identity.user_roles WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    if int(result.scalar_one()) > 0:
        return await load_user_roles(db, user_id, legacy_role)
    roles = normalize_roles([], fallback_role=legacy_role)
    return await set_user_roles(db, user_id, roles)

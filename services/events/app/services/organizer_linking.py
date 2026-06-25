"""Lie les colonnes import organisateur → utilisateur support administratif."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tip_common.email_identity import normalize_email


async def resolve_support_user_ids_by_email(
    db: AsyncSession,
    emails: set[str],
) -> dict[str, int]:
    normalized = {normalize_email(e) for e in emails if e and normalize_email(e)}
    if not normalized:
        return {}

    result = await db.execute(
        text(
            """
            SELECT DISTINCT LOWER(TRIM(u.email)) AS email, u.id
            FROM identity.utilisateurs u
            JOIN identity.user_roles ur ON ur.user_id = u.id
            WHERE ur.role = 'support_administratif'
              AND u.est_actif = TRUE
              AND LOWER(TRIM(u.email)) = ANY(:emails)
            """
        ),
        {"emails": list(normalized)},
    )
    return {row.email: row.id for row in result.mappings().all()}

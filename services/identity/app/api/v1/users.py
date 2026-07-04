from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps.auth import get_current_utilisateur
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurResponse
from app.services.user_roles import load_user_roles
from tip_common.roles import normalize_roles, primary_role

router = APIRouter()


async def _users_with_role(db: AsyncSession, role: str) -> list[UtilisateurResponse]:
    role = normalize_roles([role])[0]
    result = await db.execute(
        text(
            """
            SELECT u.id, u.clerk_id, u.username, u.email, u.nom, u.prenom, u.phone,
                   u.role, u.est_actif, u.created_at, u.activation_date,
                   u.deactivation_date, u.last_access
            FROM identity.utilisateurs u
            JOIN identity.user_roles ur ON ur.user_id = u.id
            WHERE (ur.role = :role OR ur.role = 'administrateur') AND u.est_actif = TRUE
            ORDER BY u.prenom, u.nom
            """
        ),
        {"role": role},
    )
    items: list[UtilisateurResponse] = []
    for row in result.fetchall():
        roles = await load_user_roles(db, row.id, row.role)
        items.append(
            UtilisateurResponse(
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
                activation_date=row.activation_date,
                deactivation_date=row.deactivation_date,
                last_access=row.last_access,
            )
        )
    return items


@router.get("/by-role/{role}", response_model=list[UtilisateurResponse])
async def list_users_by_role(
    role: str,
    _: Utilisateur = Depends(get_current_utilisateur),
    db: AsyncSession = Depends(get_db),
) -> list[UtilisateurResponse]:
    allowed = {"controle_procedure", "validateur", "support_administratif", "administrateur"}
    if role not in allowed:
        role = "controle_procedure"
    return await _users_with_role(db, role)

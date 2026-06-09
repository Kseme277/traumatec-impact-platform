import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.utilisateur import Utilisateur
from app.services.clerk_client import ClerkClient
from tip_common.email_identity import (
    email_local_part,
    emails_match_for_linking,
    normalize_email,
)

logger = logging.getLogger(__name__)


async def link_utilisateur_from_clerk(
    db: AsyncSession,
    *,
    clerk_id: str,
    clerk_email: str,
) -> Utilisateur | None:
    """Associe un utilisateur TIP à partir de l'email Clerk (exact ou variante proche)."""
    clerk_email = normalize_email(clerk_email)

    result = await db.execute(select(Utilisateur).where(Utilisateur.clerk_id == clerk_id))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is not None:
        if utilisateur.email != clerk_email:
            utilisateur.email = clerk_email
            await db.commit()
            await db.refresh(utilisateur)
        return utilisateur

    result = await db.execute(select(Utilisateur).where(Utilisateur.email == clerk_email))
    utilisateur = result.scalar_one_or_none()
    if utilisateur is not None:
        utilisateur.clerk_id = clerk_id
        await db.commit()
        await db.refresh(utilisateur)
        logger.info("Liaison Clerk ↔ TIP (email exact) %s", clerk_email)
        return utilisateur

    local = email_local_part(clerk_email)
    result = await db.execute(
        select(Utilisateur).where(Utilisateur.email.ilike(f"{local}@%"))
    )
    candidates = list(result.scalars().all())
    matches = [u for u in candidates if emails_match_for_linking(u.email, clerk_email)]

    if len(matches) == 1:
        utilisateur = matches[0]
        previous_email = utilisateur.email
        utilisateur.clerk_id = clerk_id
        utilisateur.email = clerk_email
        await db.commit()
        await db.refresh(utilisateur)
        logger.info(
            "Liaison Clerk ↔ TIP (email proche) %s → %s",
            previous_email,
            clerk_email,
        )
        return utilisateur

    if len(matches) > 1:
        logger.warning(
            "Liaison ambiguë pour %s : %s candidats TIP",
            clerk_email,
            len(matches),
        )
    return None


async def resolve_utilisateur_for_clerk(
    db: AsyncSession,
    settings,
    *,
    clerk_id: str,
    clerk_email: str | None,
) -> Utilisateur | None:
    if clerk_email:
        linked = await link_utilisateur_from_clerk(db, clerk_id=clerk_id, clerk_email=clerk_email)
        if linked is not None:
            return linked

    if settings.clerk_secret_key:
        clerk = ClerkClient(settings)
        fetched = await clerk.get_primary_email(clerk_id)
        if fetched:
            return await link_utilisateur_from_clerk(db, clerk_id=clerk_id, clerk_email=fetched)

    return None

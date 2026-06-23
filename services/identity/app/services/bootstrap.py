import logging

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.utilisateur import Utilisateur
from app.services.clerk_client import ClerkAPIError, ClerkClient
from app.services.user_roles import set_user_roles

logger = logging.getLogger(__name__)


async def _resolve_clerk_id(clerk: ClerkClient, *, email: str, settings) -> str | None:
    configured_id = settings.bootstrap_admin_clerk_id.strip() or None
    if configured_id:
        return configured_id

    try:
        result = await clerk.create_user_with_invitation(
            email=email,
            nom=settings.bootstrap_admin_nom or "Admin",
            prenom=settings.bootstrap_admin_prenom or "TIP",
            role="administrateur",
        )
        if result.clerk_id:
            return result.clerk_id
        return await clerk.find_user_id_by_email(email)
    except ClerkAPIError as exc:
        logger.warning(
            "Bootstrap admin : création Clerk impossible (%s), recherche par email…",
            exc,
        )
        return await clerk.find_user_id_by_email(email)


async def bootstrap_default_admin() -> None:
    """Crée ou synchronise l'administrateur initial depuis les variables d'environnement."""
    settings = get_settings()

    if not settings.bootstrap_admin_email:
        logger.info("Bootstrap admin ignoré : BOOTSTRAP_ADMIN_EMAIL non défini")
        return

    if not settings.clerk_secret_key:
        logger.warning(
            "Bootstrap admin impossible : CLERK_SECRET_KEY manquant "
            "(ou définir BOOTSTRAP_ADMIN_CLERK_ID)"
        )
        return

    email = settings.bootstrap_admin_email.strip().lower()
    role = "administrateur"
    clerk = ClerkClient(settings)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Utilisateur).where(Utilisateur.email == email))
        existing_user = existing.scalar_one_or_none()

        if existing_user:
            try:
                resolved_id = (
                    settings.bootstrap_admin_clerk_id.strip()
                    or await clerk.find_user_id_by_email(email)
                )
                if resolved_id and existing_user.clerk_id != resolved_id:
                    existing_user.clerk_id = resolved_id
                    logger.info("Bootstrap admin : clerk_id synchronisé pour %s", email)
                await clerk.sync_public_metadata(existing_user.clerk_id, role=role, roles=[role])
                await set_user_roles(db, existing_user.id, [role])
                await db.commit()
            except ClerkAPIError as exc:
                logger.warning("Bootstrap sync admin existant : %s", exc)
            logger.info("Bootstrap admin : %s déjà présent en base", email)
            return

        clerk_id = await _resolve_clerk_id(clerk, email=email, settings=settings)
        if not clerk_id:
            logger.error(
                "Bootstrap admin abandonné : %s introuvable dans Clerk. "
                "Créez le compte dans Clerk ou renseignez BOOTSTRAP_ADMIN_CLERK_ID.",
                email,
            )
            return

        try:
            await clerk.sync_public_metadata(clerk_id, role=role)
        except ClerkAPIError as exc:
            logger.warning("Sync metadata Clerk bootstrap : %s", exc)

        utilisateur = Utilisateur(
            clerk_id=clerk_id,
            email=email,
            nom=settings.bootstrap_admin_nom or "Admin",
            prenom=settings.bootstrap_admin_prenom or "TIP",
            role=role,
            est_actif=True,
        )
        db.add(utilisateur)
        await db.flush()
        await set_user_roles(db, utilisateur.id, [role])
        await db.commit()
        logger.info("Administrateur bootstrap créé : %s (clerk_id=%s)", email, clerk_id)

import logging

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.utilisateur import Utilisateur
from app.services.clerk_client import ClerkAPIError, ClerkClient
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


async def bootstrap_default_admin() -> None:
    """Crée l'administrateur initial depuis les variables d'environnement."""
    settings = get_settings()

    if not settings.bootstrap_admin_email:
        logger.info("Bootstrap admin ignoré : BOOTSTRAP_ADMIN_EMAIL non défini")
        return

    email = settings.bootstrap_admin_email.strip().lower()

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Utilisateur).where(Utilisateur.email == email))
        if existing.scalar_one_or_none():
            logger.info("Bootstrap admin ignoré : %s existe déjà", email)
            return

        clerk_id = settings.bootstrap_admin_clerk_id.strip() or None
        role = "administrateur"

        if not clerk_id:
            if not settings.clerk_secret_key:
                logger.warning(
                    "Bootstrap admin impossible : définir BOOTSTRAP_ADMIN_CLERK_ID "
                    "ou CLERK_SECRET_KEY pour création automatique"
                )
                return

            clerk = ClerkClient(settings)
            try:
                result = await clerk.create_user_with_invitation(
                    email=email,
                    nom=settings.bootstrap_admin_nom or "Admin",
                    prenom=settings.bootstrap_admin_prenom or "TIP",
                    role=role,
                )
                clerk_id = result.clerk_id
                mailer = EmailService(settings)
                if result.invitation_url:
                    await mailer.send_invitation(
                        to_email=email,
                        prenom=settings.bootstrap_admin_prenom or "TIP",
                        nom=settings.bootstrap_admin_nom or "Admin",
                        invitation_url=result.invitation_url,
                    )
            except ClerkAPIError as exc:
                logger.error("Bootstrap admin Clerk échoué : %s", exc)
                return
        elif settings.clerk_secret_key:
            clerk = ClerkClient(settings)
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
        await db.commit()
        logger.info("Administrateur bootstrap créé : %s (clerk_id=%s)", email, clerk_id)

"""Import automatique des paquets système au démarrage si catalogue vide."""

from __future__ import annotations

import logging

from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.catalog import PackageBundle
from app.services.package_import import bootstrap_system_packages

logger = logging.getLogger(__name__)


async def bootstrap_packages_on_startup() -> None:
    import os

    if os.getenv("PACKAGE_BOOTSTRAP_DISABLED", "").strip().lower() in ("1", "true", "yes"):
        logger.info("Bootstrap paquets désactivé (PACKAGE_BOOTSTRAP_DISABLED).")
        return

    settings = get_settings()
    try:
        async with AsyncSessionLocal() as db:
            count = int(
                (await db.execute(select(func.count()).select_from(PackageBundle))).scalar_one()
            )
            if count > 0:
                logger.info("Catalogue paquets : %s version(s) déjà en base — skip bootstrap.", count)
                return
            summaries = await bootstrap_system_packages(
                db,
                settings,
                uploaded_by_id=None,
                force=False,
            )
            if summaries:
                logger.info(
                    "Bootstrap paquets système : %s type(s) importé(s).",
                    len(summaries),
                )
            else:
                logger.warning("Bootstrap paquets : aucun ZIP importé (vérifier package-zips/).")
    except Exception as exc:
        logger.warning("Bootstrap paquets au démarrage ignoré : %s", exc)

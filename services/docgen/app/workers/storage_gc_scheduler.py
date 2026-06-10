"""Planificateur GC — exécute le nettoyage MinIO périodiquement."""

from __future__ import annotations

import asyncio
import logging
import os
logger = logging.getLogger(__name__)

INTERVAL_SECONDS = int(os.getenv("STORAGE_GC_INTERVAL_SECONDS", "3600"))


async def _run_once() -> None:
    from app.core.config import get_settings
    from app.core.database import AsyncSessionLocal
    from app.services.storage_garbage_collector import run_storage_garbage_collection
    from tip_common.storage import get_object_storage

    settings = get_settings()
    if settings.storage_backend.lower() != "minio":
        logger.info("GC stockage ignoré (backend=%s)", settings.storage_backend)
        return
    if not settings.minio_access_key or not settings.minio_secret_key:
        logger.warning("GC stockage ignoré — MinIO non configuré")
        return

    storage = get_object_storage(settings)
    async with AsyncSessionLocal() as session:
        await run_storage_garbage_collection(session, storage, force=False)


async def _scheduler_loop() -> None:
    while True:
        try:
            await _run_once()
        except Exception:
            logger.exception("Erreur GC stockage")
        await asyncio.sleep(INTERVAL_SECONDS)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logger.info("Planificateur GC démarré (intervalle=%ss)", INTERVAL_SECONDS)
    asyncio.run(_scheduler_loop())


if __name__ == "__main__":
    main()

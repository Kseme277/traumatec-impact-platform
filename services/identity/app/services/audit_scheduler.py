import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.services.audit_service import get_export_config, run_scheduled_export

logger = logging.getLogger(__name__)


def _seconds_until_next_run(last_run_at: datetime | None, interval_hours: int) -> float:
    interval_seconds = max(1, interval_hours) * 3600
    if last_run_at is None:
        return float(interval_seconds)

    next_run = last_run_at + timedelta(hours=max(1, interval_hours))
    remaining = (next_run - datetime.now(timezone.utc)).total_seconds()
    return max(60.0, remaining)


async def audit_export_loop() -> None:
    """Génère des fichiers d'audit selon l'intervalle défini par l'admin."""
    while True:
        sleep_seconds = 3600.0
        try:
            settings = get_settings()
            async with AsyncSessionLocal() as db:
                config = await get_export_config(db)
                interval_hours = max(1, config.interval_hours)

            if config.enabled:
                await run_scheduled_export(settings, manual=False)

            async with AsyncSessionLocal() as db:
                config = await get_export_config(db)
                interval_hours = max(1, config.interval_hours)
                sleep_seconds = _seconds_until_next_run(config.last_run_at, interval_hours)

            await asyncio.sleep(sleep_seconds)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Erreur scheduler export audit — nouvel essai dans 1 h")
            await asyncio.sleep(3600)

"""Garbage collector MinIO — ZIP et artefacts de génération obsolètes."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tip_common.storage import GENERATIONS_PREFIX, ObjectStorage
from tip_common.system_settings import (
    GC_LAST_RUN_AT_KEY,
    GC_LAST_STATS_KEY,
    get_gc_settings,
    set_setting,
)

logger = logging.getLogger(__name__)


def _retention_cutoff(retention_days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=retention_days)


async def get_zip_inventory(session: AsyncSession, retention_days: int) -> dict[str, int]:
    """Compteurs live : ZIP disponibles, éligibles à la purge, déjà purgés."""
    cutoff = _retention_cutoff(retention_days)
    row = await session.execute(
        text(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE status = 'completed' AND zip_path IS NOT NULL
                ) AS jobs_with_zip,
                COUNT(*) FILTER (
                    WHERE status = 'completed'
                      AND zip_path IS NOT NULL
                      AND completed_at IS NOT NULL
                      AND completed_at < :cutoff
                ) AS jobs_eligible,
                COUNT(*) FILTER (
                    WHERE zip_purged_at IS NOT NULL
                ) AS jobs_purged_history
            FROM docgen.generation_jobs
            """
        ),
        {"cutoff": cutoff},
    )
    data = row.mappings().one()
    return {
        "jobs_with_zip": int(data["jobs_with_zip"] or 0),
        "jobs_eligible": int(data["jobs_eligible"] or 0),
        "jobs_purged_history": int(data["jobs_purged_history"] or 0),
        "retention_days": retention_days,
        "cutoff": cutoff.isoformat(),
    }


def _delete_storage_key(storage: ObjectStorage, key: str, *, stats: dict[str, int]) -> None:
    if not key:
        return
    try:
        if storage.exists(key):
            storage.delete(key)
            stats["objects_deleted"] += 1
    except Exception as exc:
        logger.warning("Suppression MinIO échouée (%s) : %s", key, exc)
        stats["errors"] += 1


def _collect_job_keys(zip_path: str | None, traceability: dict[str, Any] | None, job_id: UUID) -> set[str]:
    keys: set[str] = set()
    if zip_path:
        keys.add(zip_path)
    if isinstance(traceability, dict):
        for artifact in traceability.get("artifacts") or []:
            if isinstance(artifact, str) and artifact.strip():
                keys.add(artifact.strip())
        extra_zip = traceability.get("zip_path")
        if isinstance(extra_zip, str) and extra_zip.strip():
            keys.add(extra_zip.strip())
    keys.add(f"{GENERATIONS_PREFIX}{job_id}/")
    return keys


async def run_storage_garbage_collection(
    session: AsyncSession,
    storage: ObjectStorage,
    *,
    force: bool = False,
    purge_all: bool = False,
) -> dict[str, Any]:
    """Supprime les ZIP/artefacts MinIO expirés ; conserve l'historique PostgreSQL."""
    settings = await get_gc_settings(session)
    if not settings["enabled"] and not force:
        return {"skipped": True, "reason": "disabled"}

    retention_days = int(settings["retention_days"])
    cutoff = _retention_cutoff(retention_days)
    inventory = await get_zip_inventory(session, retention_days)
    stats: dict[str, Any] = {
        "retention_days": retention_days,
        "cutoff": cutoff.isoformat(),
        "jobs_with_zip": inventory["jobs_with_zip"],
        "jobs_eligible": inventory["jobs_eligible"],
        "jobs_scanned": 0,
        "jobs_purged": 0,
        "objects_deleted": 0,
        "errors": 0,
        "forced": force,
        "purge_all": purge_all,
    }

    if purge_all:
        query = """
            SELECT id, zip_path, template_versions_json, completed_at
            FROM docgen.generation_jobs
            WHERE status = 'completed'
              AND zip_path IS NOT NULL
              AND completed_at IS NOT NULL
            ORDER BY completed_at ASC
        """
        params: dict[str, Any] = {}
    else:
        query = """
            SELECT id, zip_path, template_versions_json, completed_at
            FROM docgen.generation_jobs
            WHERE status = 'completed'
              AND zip_path IS NOT NULL
              AND completed_at IS NOT NULL
              AND completed_at < :cutoff
            ORDER BY completed_at ASC
        """
        params = {"cutoff": cutoff}

    rows = await session.execute(text(query), params)

    for row in rows.mappings():
        stats["jobs_scanned"] += 1
        job_id = UUID(str(row["id"]))
        zip_path = row["zip_path"]
        trace = row["template_versions_json"] if isinstance(row["template_versions_json"], dict) else {}

        keys_to_delete = _collect_job_keys(zip_path, trace, job_id)
        prefix = f"{GENERATIONS_PREFIX}{job_id}/"
        for listed in storage.list_keys(prefix):
            keys_to_delete.add(listed)

        for key in sorted(keys_to_delete):
            if key.endswith("/"):
                for listed in storage.list_keys(key):
                    _delete_storage_key(storage, listed, stats=stats)
            else:
                _delete_storage_key(storage, key, stats=stats)

        await session.execute(
            text(
                """
                UPDATE docgen.generation_jobs
                SET zip_path = NULL,
                    zip_purged_at = now()
                WHERE id = :id
                """
            ),
            {"id": str(job_id)},
        )
        stats["jobs_purged"] += 1

    now = datetime.now(timezone.utc).isoformat()
    await set_setting(session, GC_LAST_RUN_AT_KEY, now)
    await set_setting(session, GC_LAST_STATS_KEY, json.dumps(stats, ensure_ascii=False))
    await session.commit()

    logger.info(
        "GC stockage : %s job(s) purgé(s), %s objet(s) MinIO supprimé(s)",
        stats["jobs_purged"],
        stats["objects_deleted"],
    )
    stats["last_run_at"] = now
    return stats

"""Mise à jour des fichiers d'un paquet généré et reconstruction du ZIP."""

from __future__ import annotations

import io
import json
import zipfile
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.services.package_file_onlyoffice import content_type_for_filename, resolve_package_file
from app.services.package_workflow import trace_package_files
from tip_common.storage import get_object_storage

_SKIP_ZIP_ARC = frozenset({"00_README.txt", "_manifest.json"})


def _parse_trace(job: dict[str, Any]) -> dict[str, Any]:
    trace = job.get("template_versions_json") or {}
    if isinstance(trace, str):
        trace = json.loads(trace)
    return dict(trace)


async def rebuild_job_zip(settings: Settings, job: dict[str, Any]) -> None:
    trace = _parse_trace(job)
    prefix = trace.get("dossier_prefix") or ""
    zip_path = job.get("zip_path") or trace.get("zip_path")
    if not prefix or not zip_path:
        raise ValueError("Traçabilité paquet incomplète — impossible de reconstruire le ZIP")

    storage = get_object_storage(settings)
    zip_entries: list[tuple[str, bytes]] = []

    readme_arc = "00_README.txt"
    try:
        zip_entries.append((readme_arc, storage.download_bytes(f"{prefix}{readme_arc}")))
    except Exception:
        pass

    for item in trace_package_files(trace):
        arcname = item.get("file_path") or item.get("template_code")
        if not arcname or arcname in _SKIP_ZIP_ARC:
            continue
        if str(arcname).lower().endswith(".zip"):
            continue
        key = f"{prefix}{arcname}"
        zip_entries.append((str(arcname), storage.download_bytes(key)))

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for arcname, content in zip_entries:
            zf.writestr(arcname, content)

    storage.upload_bytes(zip_path, buffer.getvalue(), content_type="application/zip")


async def replace_package_file_bytes(
    db: AsyncSession,
    settings: Settings,
    job: dict[str, Any],
    template_code: str,
    data: bytes,
) -> dict[str, Any]:
    storage_key, filename = resolve_package_file(job, template_code)
    storage = get_object_storage(settings)
    storage.upload_bytes(storage_key, data, content_type=content_type_for_filename(filename))

    trace = _parse_trace(job)
    revisions = dict(trace.get("file_revisions") or {})
    revisions[template_code] = int(revisions.get(template_code, 0)) + 1
    trace["file_revisions"] = revisions

    job_for_zip = {**job, "template_versions_json": trace}
    await rebuild_job_zip(settings, job_for_zip)

    await db.execute(
        text(
            """
            UPDATE docgen.generation_jobs
            SET template_versions_json = CAST(:trace AS jsonb)
            WHERE id = :job_id
            """
        ),
        {"trace": json.dumps(trace, ensure_ascii=False), "job_id": str(job["id"])},
    )
    await db.commit()
    return trace


def file_revision(trace: dict[str, Any] | str | None, template_code: str) -> int:
    parsed = trace if isinstance(trace, dict) else {}
    if isinstance(trace, str):
        parsed = json.loads(trace)
    revisions = parsed.get("file_revisions") or {}
    return int(revisions.get(template_code, 0))

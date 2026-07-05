"""Jobs d'import ZIP paquet — suivi de progression (analyse IA fichier par fichier)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.models.catalog import PackageBundle
from app.services.package_import import import_package_zip

logger = logging.getLogger(__name__)


class PackageImportJobStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PackageImportJob:
    id: UUID
    filename: str
    uploaded_by_id: int
    status: PackageImportJobStatus = PackageImportJobStatus.PENDING
    phase: str = "pending"
    processed: int = 0
    total: int = 0
    message: str = "Import en attente…"
    current_file: str = ""
    use_ai: bool = False
    result: dict[str, Any] | None = None
    error: str | None = None
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False, compare=False)


class PackageImportJobStore:
    def __init__(self) -> None:
        self._jobs: dict[UUID, PackageImportJob] = {}
        self._lock = asyncio.Lock()

    async def create(self, filename: str, uploaded_by_id: int, *, use_ai: bool = True) -> PackageImportJob:
        job = PackageImportJob(
            id=uuid4(),
            filename=filename,
            uploaded_by_id=uploaded_by_id,
            use_ai=use_ai,
        )
        async with self._lock:
            self._jobs[job.id] = job
        return job

    async def get(self, job_id: UUID) -> PackageImportJob | None:
        async with self._lock:
            return self._jobs.get(job_id)

    async def update(self, job_id: UUID, **kwargs: Any) -> None:
        job = await self.get(job_id)
        if not job:
            return
        async with job._lock:
            for key, value in kwargs.items():
                if hasattr(job, key) and value is not None:
                    setattr(job, key, value)

    def update_sync(self, job_id: UUID, **kwargs: Any) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return
        for key, value in kwargs.items():
            if hasattr(job, key) and value is not None:
                setattr(job, key, value)

    def to_progress(self, job: PackageImportJob) -> dict[str, Any]:
        total = job.total or 0
        processed = min(job.processed, total) if total else job.processed
        if total > 0:
            percent = min(100, round(processed / total * 100))
        elif job.status == PackageImportJobStatus.COMPLETED:
            percent = 100
        else:
            percent = 0

        return {
            "job_id": job.id,
            "status": job.status.value,
            "phase": job.phase,
            "processed": processed,
            "total": total,
            "percent": percent,
            "message": job.message,
            "filename": job.filename,
            "current_file": job.current_file or None,
            "use_ai": job.use_ai,
            "result": job.result,
            "error": job.error,
        }


package_import_job_store = PackageImportJobStore()


async def run_package_import_job(
    db_factory,
    *,
    job_id: UUID,
    zip_bytes: bytes,
    filename: str,
    package_type_hint: str | None,
    notes: str | None,
    activate: bool,
    uploaded_by_id: int,
    use_ai: bool,
) -> None:
    settings = get_settings()

    def on_progress(
        *,
        phase: str,
        processed: int,
        total: int,
        current_file: str,
        message: str,
    ) -> None:
        status = PackageImportJobStatus.ANALYZING
        if phase == "saving":
            status = PackageImportJobStatus.SAVING
        package_import_job_store.update_sync(
            job_id,
            status=status,
            phase=phase,
            processed=processed,
            total=total,
            current_file=current_file,
            message=message,
        )

    try:
        package_import_job_store.update_sync(
            job_id,
            status=PackageImportJobStatus.ANALYZING,
            phase="analyzing",
            message="Analyse du paquet ZIP…",
        )

        async with db_factory() as db:
            summary = await import_package_zip(
                db,
                settings,
                zip_bytes=zip_bytes,
                filename=filename,
                uploaded_by_id=uploaded_by_id,
                package_type_hint=package_type_hint,
                notes=notes,
                activate=activate,
                scan_use_ai=use_ai,
                on_progress=on_progress,
            )
            bundle = await db.get(PackageBundle, UUID(summary["bundle_id"]))
            if bundle is None:
                raise ValueError("Bundle introuvable après import.")

            result = {
                "bundle": {
                    "id": str(bundle.id),
                    "package_type": bundle.package_type,
                    "version": bundle.version,
                    "label": bundle.label,
                    "source_zip_name": bundle.source_zip_name,
                    "file_count": bundle.file_count,
                    "analysis_json": bundle.analysis_json,
                    "is_active": bundle.is_active,
                    "notes": bundle.notes,
                    "created_at": bundle.created_at.isoformat(),
                },
                "message": (
                    f"Paquet {summary['package_type']} v{summary['version']} importé "
                    f"({summary['file_count']} fichiers)."
                ),
                "analysis": summary["analysis"],
            }

        package_import_job_store.update_sync(
            job_id,
            status=PackageImportJobStatus.COMPLETED,
            phase="completed",
            processed=summary.get("file_count", 0),
            total=summary.get("file_count", 0),
            message=result["message"],
            result=result,
        )
    except Exception as exc:
        logger.exception("Import paquet ZIP échoué (job %s)", job_id)
        package_import_job_store.update_sync(
            job_id,
            status=PackageImportJobStatus.FAILED,
            phase="failed",
            error=str(exc)[:500],
            message=f"Import échoué : {exc}",
        )

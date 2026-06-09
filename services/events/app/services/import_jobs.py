from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import UUID, uuid4


class ImportJobStatus(str, Enum):
    PENDING = "pending"
    PARSING = "parsing"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ImportJob:
    id: UUID
    filename: str
    imported_by_id: int
    status: ImportJobStatus = ImportJobStatus.PENDING
    phase: str = "pending"
    processed: int = 0
    total: int = 0
    message: str = "Import en attente…"
    result: dict[str, Any] | None = None
    error: str | None = None
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False, compare=False)


class ImportJobStore:
    def __init__(self) -> None:
        self._jobs: dict[UUID, ImportJob] = {}
        self._lock = asyncio.Lock()

    async def create(self, filename: str, imported_by_id: int) -> ImportJob:
        job = ImportJob(id=uuid4(), filename=filename, imported_by_id=imported_by_id)
        async with self._lock:
            self._jobs[job.id] = job
        return job

    async def get(self, job_id: UUID) -> ImportJob | None:
        async with self._lock:
            return self._jobs.get(job_id)

    async def update(
        self,
        job_id: UUID,
        *,
        status: ImportJobStatus | None = None,
        phase: str | None = None,
        processed: int | None = None,
        total: int | None = None,
        message: str | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        job = await self.get(job_id)
        if not job:
            return
        async with job._lock:
            if status is not None:
                job.status = status
            if phase is not None:
                job.phase = phase
            if processed is not None:
                job.processed = processed
            if total is not None:
                job.total = total
            if message is not None:
                job.message = message
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error

    def to_progress(self, job: ImportJob) -> dict[str, Any]:
        total = job.total or 0
        processed = min(job.processed, total) if total else job.processed
        if total > 0:
            percent = min(100, round(processed / total * 100))
        elif job.status == ImportJobStatus.COMPLETED:
            percent = 100
        elif job.status == ImportJobStatus.FAILED:
            percent = 0
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
            "result": job.result,
            "error": job.error,
        }

    def update_sync(
        self,
        job_id: UUID,
        *,
        status: ImportJobStatus | None = None,
        phase: str | None = None,
        processed: int | None = None,
        total: int | None = None,
        message: str | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        job = self._jobs.get(job_id)
        if not job:
            return
        if status is not None:
            job.status = status
        if phase is not None:
            job.phase = phase
        if processed is not None:
            job.processed = processed
        if total is not None:
            job.total = total
        if message is not None:
            job.message = message
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error


import_job_store = ImportJobStore()

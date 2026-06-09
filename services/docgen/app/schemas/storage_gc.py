from __future__ import annotations

from pydantic import BaseModel, Field


class StorageGcInventory(BaseModel):
    jobs_with_zip: int = 0
    jobs_eligible: int = 0
    jobs_purged_history: int = 0
    retention_days: int | None = None
    cutoff: str | None = None


class StorageGcStats(BaseModel):
    retention_days: int | None = None
    cutoff: str | None = None
    jobs_with_zip: int | None = None
    jobs_eligible: int | None = None
    jobs_scanned: int = 0
    jobs_purged: int = 0
    objects_deleted: int = 0
    errors: int = 0
    forced: bool = False
    purge_all: bool = False
    skipped: bool = False
    reason: str | None = None
    last_run_at: str | None = None


class StorageGcConfigResponse(BaseModel):
    enabled: bool
    retention_days: int = Field(ge=1, le=365)
    last_run_at: str | None = None
    last_stats: StorageGcStats | None = None
    inventory: StorageGcInventory


class StorageGcConfigUpdate(BaseModel):
    enabled: bool | None = None
    retention_days: int | None = Field(default=None, ge=1, le=365)


class StorageGcRunResponse(BaseModel):
    message: str
    stats: StorageGcStats


class GenerationStatusCount(BaseModel):
    status: str
    count: int = 0


class GenerationMonthCount(BaseModel):
    month: str
    jobs: int = 0
    certificates: int = 0


class GenerationEventTop(BaseModel):
    event_id: str
    event_title: str
    project_number: str
    jobs: int = 0
    certificates: int = 0


class StorageGcAnalyticsResponse(BaseModel):
    total_jobs: int = 0
    total_certificates: int = 0
    success_rate: float = 0.0
    by_status: list[GenerationStatusCount] = []
    by_month: list[GenerationMonthCount] = []
    top_events: list[GenerationEventTop] = []
    inventory: StorageGcInventory

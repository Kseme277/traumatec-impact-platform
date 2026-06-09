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

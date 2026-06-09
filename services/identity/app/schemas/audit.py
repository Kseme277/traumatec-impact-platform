from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: int | None
    action: str
    entity_type: str | None
    entity_id: str | None
    payload: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditExportConfigResponse(BaseModel):
    interval_hours: int
    enabled: bool
    last_run_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditExportConfigUpdate(BaseModel):
    interval_hours: int = Field(ge=1, le=24 * 30)
    enabled: bool = True


class AuditExportFileResponse(BaseModel):
    id: UUID
    storage_key: str
    period_start: datetime
    period_end: datetime
    record_count: int
    file_size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}

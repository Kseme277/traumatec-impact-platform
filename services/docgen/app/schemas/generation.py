from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenerationLogEntry(BaseModel):
    at: str
    level: str
    message: str


class GenerationJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    event_id: UUID
    status: str
    zip_filename: str | None
    certificate_count: int
    error_message: str | None
    logs: list[GenerationLogEntry] = Field(default_factory=list, validation_alias="logs_json")
    created_at: datetime
    completed_at: datetime | None

    @field_validator("logs", mode="before")
    @classmethod
    def normalize_logs(cls, value: list | None) -> list:
        return value or []


class GenerationStartResponse(BaseModel):
    job_id: UUID
    status: str
    message: str

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    full_name: str
    last_name: str | None = None
    first_name: str | None = None
    hospital: str | None = None
    email: str | None = None
    statut: str | None = None
    certificate_role: str
    identity_key: str | None = None
    row_number: int | None = None
    imported_at: datetime
    created_at: datetime


class ParticipantListResponse(BaseModel):
    items: list[ParticipantResponse]
    total: int
    page: int = 1
    page_size: int = 20
    total_pages: int = 1


class ParticipantStatsResponse(BaseModel):
    total: int = 0
    participants: int = 0
    enseignants: int = 0
    with_email: int = 0
    last_imported_at: datetime | None = None
    source_event_title: str | None = None
    certificate_title_formatted: str | None = None


class ParticipantImportResult(BaseModel):
    imported_count: int
    skipped_count: int = 0
    duplicate_in_file_count: int = 0
    already_in_event_count: int = 0
    known_from_other_events_count: int = 0
    enseignants_count: int = 0
    participants_count: int = 0
    source_event_title: str | None = None
    warnings: list[str] = Field(default_factory=list)


class ParticipantEventHistoryItem(BaseModel):
    event_id: UUID
    participant_id: UUID
    project_number: str | None = None
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    city: str | None = None
    country: str | None = None
    certificate_role: str


class ParticipantDetailResponse(BaseModel):
    participant: ParticipantResponse
    events_participated_count: int
    events: list[ParticipantEventHistoryItem]

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CertificateGenerationResponse(BaseModel):
    id: UUID
    event_id: UUID
    requested_by_id: int
    requested_by_name: str | None = None
    role_filter: str
    certificate_count: int
    storage_key: str
    filename: str
    created_at: datetime


class CertificateGenerationListResponse(BaseModel):
    items: list[CertificateGenerationResponse]
    total: int


class CertificateEditorConfigResponse(BaseModel):
    document_server_url: str
    config: dict
    file_revision: int | None = None


class CertificateTitleSuggestionResponse(BaseModel):
    source_event_title: str | None = None
    title_suggested: str
    title_formatted: str | None = None

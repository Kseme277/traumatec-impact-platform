"""Contrats inter-services — payloads stables pour greffer de nouveaux modules."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceHealth(BaseModel):
    status: str
    service: str


class EventSummary(BaseModel):
    """Contrat minimal Events → DocGen."""

    id: UUID
    project_number: str
    title: str
    country: str | None = None
    city: str | None = None
    certificate_set_id: UUID | None = None
    participant_count: int = 0
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class GenerationRequest(BaseModel):
    """Contrat Events/Catalog → DocGen (file Redis ou HTTP interne)."""

    event_id: UUID
    requested_by_user_id: UUID
    options: dict[str, Any] = Field(default_factory=dict)

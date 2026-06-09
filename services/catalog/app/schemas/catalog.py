from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PackageTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    document_type: str
    file_path: str
    version: int
    placeholders: dict | None
    preparation_themes: list[str] | None
    is_active: bool
    created_at: datetime


class TemplateUploadResponse(BaseModel):
    template: PackageTemplateResponse
    message: str


class TemplateEditorConfigResponse(BaseModel):
    document_server_url: str
    config: dict


class PackageBundleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    package_type: str
    version: int
    label: str
    source_zip_name: str | None
    file_count: int
    analysis_json: dict | None
    is_active: bool
    notes: str | None
    created_at: datetime


class PackageUploadResponse(BaseModel):
    bundle: PackageBundleResponse
    message: str
    analysis: dict


class EventProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    preparation_theme: str | None
    package_type: str | None = None
    event_type_label: str | None = None
    active_bundle_id: UUID | None = None
    package_template_ids: list[str] | None
    certificate_set_id: UUID | None
    is_active: bool
    created_at: datetime


class ParcoursStepResponse(BaseModel):
    step: int
    code: str
    name: str
    template_id: UUID
    file_format: str


class ParcoursResponse(BaseModel):
    code: str
    name: str
    preparation_theme: str
    package_type: str | None = None
    event_type_label: str | None = None
    activity_kind: str | None = None
    activity_label: str | None = None
    file_count: int = 0
    seminar_count: int
    steps: list[ParcoursStepResponse]



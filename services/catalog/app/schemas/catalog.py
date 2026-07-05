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


class TemplateVariableGuideItem(BaseModel):
    key: str
    placeholders: list[str]
    event_field: str
    example: str
    label: str
    description: str
    primary_placeholder: str
    category: str


class TemplateVariableKeepItem(BaseModel):
    sample: str
    label: str
    description: str


class TemplateVariableMechanism(BaseModel):
    id: str
    title: str
    description: str


class TemplateVariablesGuideResponse(BaseModel):
    locale: str
    variables: list[TemplateVariableGuideItem]
    keep_samples: list[TemplateVariableKeepItem]
    categories: list[dict[str, str]]
    mechanisms: list[TemplateVariableMechanism]


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


class PackageImportJobStartResponse(BaseModel):
    job_id: UUID
    filename: str


class PackageImportJobProgressResponse(BaseModel):
    job_id: UUID
    status: str
    phase: str
    processed: int
    total: int
    percent: int
    message: str
    filename: str
    current_file: str | None = None
    use_ai: bool = False
    result: dict | None = None
    error: str | None = None


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


class PackageTypeDefinitionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    label: str = Field(min_length=1, max_length=64)
    activity_kind: str = Field(min_length=2, max_length=32)
    activity_label: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    preparation_theme: str = Field(default="operatory", max_length=32)
    duration_days: int = Field(default=3, ge=1, le=30)
    sort_order: int = Field(default=0, ge=0)


class PackageTypeDefinitionUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=64)
    activity_kind: str | None = Field(default=None, min_length=2, max_length=32)
    activity_label: str | None = Field(default=None, min_length=1, max_length=64)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    preparation_theme: str | None = Field(default=None, max_length=32)
    duration_days: int | None = Field(default=None, ge=1, le=30)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class PackageTypeDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    label: str
    activity_kind: str
    activity_label: str
    title: str
    description: str | None
    preparation_theme: str
    duration_days: int
    sort_order: int
    is_active: bool
    created_at: datetime


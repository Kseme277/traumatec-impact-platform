from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.teacher import TeacherResponse

EventStatus = Literal["imported", "in_progress", "ready", "generated", "error"]
PreparationTheme = Literal["operatory", "pbo", "iec"]


class EventBase(BaseModel):
    project_number: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=512)
    event_type: str | None = Field(default=None, max_length=255)
    preparation_theme: PreparationTheme | None = None
    country: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=128)
    region: str | None = Field(default=None, max_length=128)
    responsible_person: str | None = Field(default=None, max_length=255)
    national_responsible_name: str | None = Field(default=None, max_length=255)
    national_responsible_email: str | None = Field(default=None, max_length=255)
    national_responsible_phone: str | None = Field(default=None, max_length=32)
    organizer_responsible_user_id: int | None = None
    responsible_email: str | None = Field(default=None, max_length=255)
    responsible_phone: str | None = Field(default=None, max_length=64)
    project_status: str | None = Field(default=None, max_length=128)
    cost_center: str | None = Field(default=None, max_length=255)
    participants_expected: int | None = None
    participants_real: int | None = None
    amount_chf: Decimal | None = None
    payments_done_chf: Decimal | None = None
    percent_paid: Decimal | None = None
    balance_to_pay_chf: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: EventStatus = "imported"
    metadata_json: dict[str, Any] | None = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    project_number: str | None = Field(default=None, max_length=64)
    title: str | None = Field(default=None, max_length=512)
    event_type: str | None = Field(default=None, max_length=255)
    preparation_theme: PreparationTheme | None = None
    country: str | None = Field(default=None, max_length=128)
    city: str | None = Field(default=None, max_length=128)
    region: str | None = Field(default=None, max_length=128)
    responsible_person: str | None = Field(default=None, max_length=255)
    national_responsible_name: str | None = Field(default=None, max_length=255)
    national_responsible_email: str | None = Field(default=None, max_length=255)
    national_responsible_phone: str | None = Field(default=None, max_length=32)
    organizer_responsible_user_id: int | None = None
    responsible_email: str | None = Field(default=None, max_length=255)
    responsible_phone: str | None = Field(default=None, max_length=64)
    project_status: str | None = Field(default=None, max_length=128)
    start_date: date | None = None
    end_date: date | None = None
    status: EventStatus | None = None
    package_type_override: str | None = Field(default=None, max_length=32)
    teacher_ids: list[UUID] | None = None


class PackageCandidate(BaseModel):
    package_type: str
    package_label: str
    preparation_theme: str | None = None
    activity_kind: str
    activity_label: str
    expected_package_days: int
    suggested: bool = False
    score: float = 0.0


class InferredEventPackage(BaseModel):
    package_type: str
    package_label: str
    activity_kind: str
    activity_label: str
    preparation_theme: str | None = None
    duration_days: int
    expected_package_days: int
    package_candidates: list[PackageCandidate] = []
    classifier: str = "rules"
    confidence: float | None = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_number: str
    title: str
    event_type: str | None
    preparation_theme: str | None
    country: str | None
    city: str | None
    region: str | None
    responsible_person: str | None
    national_responsible_name: str | None = None
    national_responsible_email: str | None = None
    national_responsible_phone: str | None = None
    organizer_responsible_user_id: int | None = None
    teachers: list[TeacherResponse] = Field(default_factory=list)
    project_status: str | None
    cost_center: str | None
    participants_expected: int | None
    participants_real: int | None
    amount_chf: Decimal | None
    payments_done_chf: Decimal | None
    percent_paid: Decimal | None
    balance_to_pay_chf: Decimal | None
    start_date: date | None
    end_date: date | None
    status: str
    metadata_json: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    inferred_package: InferredEventPackage | None = None


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int


class ImportResultResponse(BaseModel):
    import_id: UUID
    filename: str
    year: int
    imported_count: int
    skipped_count: int
    errors: list[str]


class ImportJobStartResponse(BaseModel):
    job_id: UUID
    filename: str


class ImportJobProgressResponse(BaseModel):
    job_id: UUID
    status: Literal["pending", "parsing", "importing", "completed", "failed"]
    phase: str
    processed: int
    total: int
    percent: int
    message: str
    filename: str
    result: ImportResultResponse | None = None
    error: str | None = None


class DashboardFinancialStats(BaseModel):
    total_amount_chf: float = 0
    total_payments_chf: float = 0
    total_balance_chf: float = 0
    events_with_amount: int = 0
    avg_percent_paid: float | None = None


class DashboardParticipantsStats(BaseModel):
    expected_total: int = 0
    real_total: int = 0
    events_with_participants: int = 0


class DashboardStatsResponse(BaseModel):
    total: int
    active: int
    closed: int
    open_count: int = 0
    closed_count: int = 0
    cancelled_count: int = 0
    by_status: dict[str, int]
    by_type: dict[str, int]
    by_country: dict[str, int]
    by_project_status: dict[str, int] = {}
    by_region: dict[str, int] = {}
    financial: DashboardFinancialStats = Field(default_factory=DashboardFinancialStats)
    participants: DashboardParticipantsStats = Field(default_factory=DashboardParticipantsStats)
    calendar: list[dict]
    calendar_year: int

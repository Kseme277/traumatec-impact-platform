from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkflowFileReview(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    generation_job_id: UUID
    template_id: UUID | None
    template_code: str
    file_path: str | None
    status: str
    comment: str | None
    reviewed_by_id: int | None
    reviewed_at: datetime | None
    created_at: datetime


class WorkflowStep(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    generation_job_id: UUID
    step: str
    action: str
    actor_id: int | None
    actor_name: str | None
    comment: str | None
    created_at: datetime


class WorkflowStateResponse(BaseModel):
    job_id: UUID
    event_id: UUID
    event_title: str | None = None
    project_number: str | None = None
    status: str
    workflow_status: str
    assigned_reviewer_id: int | None = None
    assigned_validator_id: int | None = None
    requested_by_id: int
    zip_filename: str | None = None
    phase_started_at: datetime | None = None
    phase_due_at: datetime | None = None
    is_overdue: bool = False
    files: list[WorkflowFileReview] = Field(default_factory=list)
    history: list[WorkflowStep] = Field(default_factory=list)


class WorkflowQueueItem(BaseModel):
    id: UUID
    event_id: UUID
    workflow_status: str
    status: str
    zip_filename: str | None
    created_at: datetime
    completed_at: datetime | None
    requested_by_id: int
    assigned_reviewer_id: int | None
    event_title: str | None
    project_number: str | None
    phase_started_at: datetime | None = None
    phase_due_at: datetime | None = None
    is_overdue: bool = False
    organizer_responsible_user_id: int | None = None


class WorkflowStatsResponse(BaseModel):
    generated: int = 0
    submitted: int = 0
    under_procedure_review: int = 0
    procedure_rejected: int = 0
    procedure_approved: int = 0
    under_final_validation: int = 0
    validator_rejected: int = 0
    approved: int = 0
    assigned_to_me: int = 0
    overdue: int = 0


class FileReviewPayload(BaseModel):
    status: str
    comment: str | None = None


class RejectPayload(BaseModel):
    comment: str = Field(min_length=1, max_length=4000)


class AssignReviewerPayload(BaseModel):
    reviewer_id: int | None = None


class SubmitPayload(BaseModel):
    reviewer_id: int = Field(ge=1)


class CompleteProcedurePayload(BaseModel):
    validator_id: int = Field(ge=1)


class DeliveryMailtoResponse(BaseModel):
    mailto_url: str
    recipient_email: str
    subject: str


class SubmitResponse(BaseModel):
    message: str = "Paquet soumis pour contrôle procédure"
    workflow: WorkflowStateResponse

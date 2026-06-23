import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    __table_args__ = {"schema": "docgen"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_by_id: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    rq_job_id: Mapped[str | None] = mapped_column(String(128))
    zip_path: Mapped[str | None] = mapped_column(String(512))
    zip_filename: Mapped[str | None] = mapped_column(String(512))
    certificate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    template_versions_json: Mapped[dict | None] = mapped_column(JSONB)
    logs_json: Mapped[list | None] = mapped_column(JSONB)
    workflow_status: Mapped[str] = mapped_column(String(32), nullable=False, default="generated")
    assigned_reviewer_id: Mapped[int | None] = mapped_column(Integer)
    assigned_validator_id: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

import uuid
from datetime import date, datetime

from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AnnualImport(Base):
    __tablename__ = "annual_imports"
    __table_args__ = {"schema": "events"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    imported_by_id: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_report: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Event(Base):
    __tablename__ = "events"
    __table_args__ = {"schema": "events"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    annual_import_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.annual_imports.id"), nullable=True
    )
    project_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preparation_theme: Mapped[str | None] = mapped_column(String(32), nullable=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    responsible_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    national_responsible_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    national_responsible_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    national_responsible_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    organizer_responsible_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    project_status: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String(255), nullable=True)
    participants_expected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    participants_real: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_chf: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    payments_done_chf: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    percent_paid: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    balance_to_pay_chf: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="imported", index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    budget_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    certificate_context_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    generation_options_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    certificate_set_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    event_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    package_template_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

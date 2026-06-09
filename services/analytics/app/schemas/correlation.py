from uuid import UUID

from pydantic import BaseModel, Field


class CorrelationPoint(BaseModel):
    event_id: UUID
    event_title: str
    city: str | None = None
    country: str | None = None
    preparation_theme: str | None = None
    amount_chf: float
    participants_expected: int | None = None
    participants_real: int | None = None
    risk_score: float
    predicted_participants: int
    event_month: int | None = None


class CorrelationCoeffs(BaseModel):
    budget_risk: float | None = None
    budget_predicted_participants: float | None = None
    risk_predicted_participants: float | None = None
    budget_real_participants: float | None = None


class ThemeAggregate(BaseModel):
    theme: str
    count: int
    avg_risk: float
    avg_predicted_participants: float
    avg_budget: float


class CityAggregate(BaseModel):
    city: str
    count: int
    avg_risk: float
    avg_predicted_participants: float


class CorrelationDatasetResponse(BaseModel):
    items: list[CorrelationPoint]
    coefficients: CorrelationCoeffs
    by_theme: list[ThemeAggregate] = Field(default_factory=list)
    by_city: list[CityAggregate] = Field(default_factory=list)

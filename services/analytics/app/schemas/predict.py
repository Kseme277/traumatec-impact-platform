from uuid import UUID

from pydantic import BaseModel, Field


class PredictEventRequest(BaseModel):
    event_id: UUID | None = None
    total_budget: float | None = Field(default=None, ge=0)
    allocation_logistique: float | None = Field(default=None, ge=0)
    allocation_pedagogique: float | None = Field(default=None, ge=0)
    ratio_perdiem: float | None = Field(default=None, ge=0, le=1)
    id_region: int | None = None
    type_seminaire: str | None = None
    mois_evenement: int | None = Field(default=None, ge=1, le=12)
    budget_alloue: float | None = Field(default=None, ge=0)
    city: str | None = None
    region: str | None = None
    country: str | None = None
    preparation_theme: str | None = None
    event_type: str | None = None


class PredictEventResponse(BaseModel):
    risk_score: float = Field(ge=0, le=100, description="Score de risque budgétaire (%)")
    predicted_participants: int = Field(ge=0)
    event_id: UUID | None = None
    event_title: str | None = None

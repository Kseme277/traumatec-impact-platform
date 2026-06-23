from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NationalContactBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=128)
    is_active: bool = True


class NationalContactCreate(NationalContactBase):
    pass


class NationalContactUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None


class NationalContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str | None
    phone: str | None
    country: str | None
    is_active: bool
    created_at: datetime


class NationalContactListResponse(BaseModel):
    items: list[NationalContactResponse]
    total: int

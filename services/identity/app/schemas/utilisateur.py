from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


RoleUtilisateur = Literal["administrateur", "preparateur"]


class UtilisateurCreate(BaseModel):
    email: EmailStr
    nom: str = Field(min_length=1, max_length=128)
    prenom: str = Field(min_length=1, max_length=128)
    role: RoleUtilisateur


class UtilisateurResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_id: str | None
    email: str
    nom: str
    prenom: str
    role: str
    est_actif: bool
    created_at: datetime


class UtilisateurMeResponse(UtilisateurResponse):
    pass


class ToggleStatusResponse(BaseModel):
    id: int
    est_actif: bool
    message: str

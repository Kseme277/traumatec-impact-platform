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


class UtilisateurCreateResponse(UtilisateurResponse):
    invitation_sent: bool = False
    invitation_url: str | None = None
    invitation_hint: str | None = None


class UtilisateurMeResponse(UtilisateurResponse):
    pass


class UtilisateurMeUpdate(BaseModel):
    nom: str = Field(min_length=1, max_length=128)
    prenom: str = Field(min_length=1, max_length=128)


class ToggleStatusResponse(BaseModel):
    id: int
    est_actif: bool
    message: str


class InvitationActionResponse(ToggleStatusResponse):
    invitation_url: str | None = None
    invitation_sent: bool = False
    invitation_hint: str | None = None


class EmailCheckResponse(BaseModel):
    normalized_email: str
    tip_exists: bool
    clerk_exists: bool
    conflicting_clerk_emails: list[str] = []
    suggested_email: str | None = None
    can_create: bool
    message: str | None = None

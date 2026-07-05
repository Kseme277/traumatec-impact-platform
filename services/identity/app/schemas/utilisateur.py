from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from tip_common.roles import normalize_roles, primary_role

RoleUtilisateur = Literal[
    "administrateur",
    "support_administratif",
    "controle_procedure",
    "validateur",
    "preparateur",
]


class UtilisateurCreate(BaseModel):
    email: EmailStr
    nom: str = Field(min_length=1, max_length=128)
    prenom: str = Field(min_length=1, max_length=128)
    role: RoleUtilisateur | None = None
    roles: list[RoleUtilisateur] | None = None
    username: str | None = Field(default=None, min_length=2, max_length=64)
    phone: str | None = Field(default=None, max_length=32)

    @model_validator(mode="after")
    def resolve_roles(self) -> "UtilisateurCreate":
        if not self.roles and not self.role:
            self.role = "support_administratif"
        return self


class UtilisateurResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_id: str | None
    username: str | None = None
    email: str
    nom: str
    prenom: str
    phone: str | None = None
    role: str
    roles: list[str] = Field(default_factory=list)
    est_actif: bool
    created_at: datetime
    activation_date: datetime | None = None
    deactivation_date: datetime | None = None
    last_access: datetime | None = None
    avatar_url: str | None = None


class UtilisateurCreateResponse(UtilisateurResponse):
    invitation_sent: bool = False
    invitation_url: str | None = None
    invitation_hint: str | None = None


class UtilisateurMeResponse(UtilisateurResponse):
    pass


class UtilisateurMeUpdate(BaseModel):
    nom: str = Field(min_length=1, max_length=128)
    prenom: str = Field(min_length=1, max_length=128)


class UtilisateurRolesUpdate(BaseModel):
    roles: list[RoleUtilisateur] = Field(min_length=1)


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

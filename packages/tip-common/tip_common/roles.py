"""Rôles TIP et helpers de permission."""

from __future__ import annotations

from typing import Literal

RoleUtilisateur = Literal[
    "administrateur",
    "support_administratif",
    "controle_procedure",
    "validateur",
    "preparateur",  # legacy — mappé vers support_administratif
]

ALL_ROLES: tuple[str, ...] = (
    "administrateur",
    "support_administratif",
    "controle_procedure",
    "validateur",
)

LEGACY_ROLE_MAP: dict[str, str] = {
    "preparateur": "support_administratif",
}


def normalize_role(role: str) -> str:
    role = role.strip().lower()
    return LEGACY_ROLE_MAP.get(role, role)


def normalize_roles(roles: list[str] | None, fallback_role: str | None = None) -> list[str]:
    seen: list[str] = []
    for raw in roles or []:
        role = normalize_role(raw)
        if role in ALL_ROLES and role not in seen:
            seen.append(role)
    if not seen and fallback_role:
        role = normalize_role(fallback_role)
        if role in ALL_ROLES:
            seen.append(role)
    if not seen:
        seen.append("support_administratif")
    return seen


def primary_role(roles: list[str]) -> str:
    normalized = normalize_roles(roles)
    if "administrateur" in normalized:
        return "administrateur"
    return normalized[0]


def has_role(roles: list[str], role: str) -> bool:
    return normalize_role(role) in {normalize_role(r) for r in roles}


def has_any_role(roles: list[str], *required: str) -> bool:
    return any(has_role(roles, role) for role in required)


def is_admin_roles(roles: list[str]) -> bool:
    return has_role(roles, "administrateur")


def can_manage_templates(roles: list[str]) -> bool:
    return is_admin_roles(roles)


def can_generate_packages(roles: list[str]) -> bool:
    return has_any_role(roles, "administrateur", "support_administratif")


def can_submit_packages(roles: list[str]) -> bool:
    return has_any_role(roles, "administrateur", "support_administratif")


def can_review_procedure(roles: list[str]) -> bool:
    return has_any_role(roles, "administrateur", "controle_procedure")


def can_validate_final(roles: list[str]) -> bool:
    return has_any_role(roles, "administrateur", "validateur")


def can_view_users(roles: list[str]) -> bool:
    return has_any_role(roles, "administrateur", "support_administratif")

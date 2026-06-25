"""Filtrage des événements par responsable organisation (support administratif)."""

from __future__ import annotations

from fastapi import HTTPException, status

from tip_common.security import AuthenticatedUser


def scopes_events_to_organizer(user: AuthenticatedUser) -> bool:
    """Le support ne voit et ne modifie que les événements dont il est responsable organisation."""
    if user.is_admin:
        return False
    return "support_administratif" in user.roles


def assert_event_access(user: AuthenticatedUser, organizer_user_id: int | None) -> None:
    if not scopes_events_to_organizer(user):
        return
    if organizer_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux événements dont vous êtes responsable organisation.",
        )

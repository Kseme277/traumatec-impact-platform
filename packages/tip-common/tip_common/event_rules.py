"""Règles métier événements (dates, champs immuables, workflow)."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import HTTPException, status

from tip_common.roles import has_any_role, is_admin_roles

# Champs Excel importés — lecture seule pour support (hors admin)
IMPORT_LOCKED_FIELDS = frozenset(
    {
        "project_number",
        "start_date",
        "end_date",
        "event_type",
        "country",
        "region",
        "city",
        "budget_chf",
        "participants_expected",
        "participants_actual",
        "project_status",
    }
)

WORKFLOW_LOCK_STATUSES = frozenset(
    {
        "submitted",
        "under_procedure_review",
        "procedure_approved",
        "under_final_validation",
        "approved",
    }
)


def validate_event_dates(*, start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La date de fin doit être postérieure ou égale à la date de début",
        )


def assert_event_dates_editable(*, end_date: date | None, workflow_status: str | None) -> None:
    if workflow_status and workflow_status in WORKFLOW_LOCK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Les dates ne peuvent plus être modifiées : un paquet est en cours de validation",
        )
    if end_date and end_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Impossible de modifier un événement déjà passé",
        )


def filter_update_payload_for_role(
    payload: dict[str, Any],
    *,
    roles: list[str],
    workflow_status: str | None = None,
) -> dict[str, Any]:
    """Retire les champs interdits selon le rôle."""
    if is_admin_roles(roles):
        return payload

    if not has_any_role(roles, "support_administratif"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modification d'événement non autorisée",
        )

    if workflow_status and workflow_status in WORKFLOW_LOCK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Événement verrouillé : paquet soumis ou en validation",
        )

    filtered = dict(payload)
    for field in IMPORT_LOCKED_FIELDS:
        filtered.pop(field, None)
    filtered.pop("organizer_responsible_user_id", None)
    return filtered


async def get_event_workflow_status(db, event_id) -> str | None:
    from sqlalchemy import text

    result = await db.execute(
        text(
            """
            SELECT workflow_status
            FROM docgen.generation_jobs
            WHERE event_id = :event_id AND status = 'completed'
            ORDER BY completed_at DESC NULLS LAST
            LIMIT 1
            """
        ),
        {"event_id": str(event_id)},
    )
    row = result.one_or_none()
    return row.workflow_status if row else None

"""Échéances par phase du workflow paquet."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# Jours ouvrés métier (calendaires) par phase active
PHASE_DEADLINE_DAYS: dict[str, int] = {
    "generated": 7,
    "submitted": 3,
    "under_procedure_review": 5,
    "under_final_validation": 3,
    "approved": 2,
    "procedure_rejected": 5,
    "validator_rejected": 5,
}


def compute_phase_due_at(
    workflow_status: str,
    *,
    from_time: datetime | None = None,
) -> datetime | None:
    days = PHASE_DEADLINE_DAYS.get(workflow_status)
    if days is None:
        return None
    start = from_time or datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    return start + timedelta(days=days)


def is_phase_overdue(due_at: datetime | None, *, now: datetime | None = None) -> bool:
    if due_at is None:
        return False
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    due = due_at if due_at.tzinfo else due_at.replace(tzinfo=timezone.utc)
    return current > due

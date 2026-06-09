from __future__ import annotations

FINISHED_STATUSES = frozenset({"closed", "cancelled", "canceled", "cloture", "clôturé", "annule", "annulé"})
OPEN_STATUSES = frozenset({"open", "ouvert", "en cours"})
CANCELLED_STATUSES = frozenset({"cancelled", "canceled", "annule", "annulé"})
CLOSED_STATUSES = frozenset({"closed", "cloture", "clôturé"})


def normalize_project_status(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    key = value.strip().lower()
    if key in OPEN_STATUSES:
        return "Open"
    if key in CANCELLED_STATUSES or "cancel" in key:
        return "Cancelled"
    if key in CLOSED_STATUSES or "clos" in key or "clotur" in key:
        return "Closed"
    return value.strip()


def is_finished_project_status(value: str | None) -> bool:
    if not value or not value.strip():
        return False
    return value.strip().lower() in FINISHED_STATUSES or normalize_project_status(value) in {
        "Closed",
        "Cancelled",
    }


def tip_status_from_project_status(project_status: str | None) -> str:
    normalized = normalize_project_status(project_status)
    if normalized in {"Closed", "Cancelled"}:
        return "generated"
    return "imported"


def project_status_filter_values(filter_value: str) -> list[str]:
    """Valeurs DB correspondant au filtre normalisé Open / Closed / Cancelled."""
    normalized = normalize_project_status(filter_value) or filter_value.strip()
    if normalized == "Open":
        return ["Open", "open", "Ouvert", "ouvert"]
    if normalized == "Closed":
        return ["Closed", "closed", "Cloture", "cloture", "Clôturé", "clôturé"]
    if normalized == "Cancelled":
        return ["Cancelled", "cancelled", "Canceled", "canceled", "Annulé", "annulé", "Annule", "annule"]
    return [filter_value.strip()]

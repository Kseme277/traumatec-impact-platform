"""Contrôles de complétude événement avant génération (miroir frontend)."""

from __future__ import annotations

import re
from typing import Any

from tip_common.package_types import infer_activity_kind

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _national_email(event: dict[str, Any]) -> str:
    meta = event.get("metadata_json") or {}
    if isinstance(meta, str):
        meta = {}
    return str(
        event.get("national_responsible_email")
        or meta.get("national_responsible_email")
        or meta.get("responsible_email")
        or "",
    ).strip()


def _national_phone(event: dict[str, Any]) -> str:
    meta = event.get("metadata_json") or {}
    if isinstance(meta, str):
        meta = {}
    return str(
        event.get("national_responsible_phone")
        or meta.get("national_responsible_phone")
        or meta.get("responsible_phone")
        or "",
    ).strip()


def is_event_ready_for_generation(event: dict[str, Any]) -> bool:
    if not str(event.get("project_number") or "").strip():
        return False
    if not str(event.get("title") or "").strip():
        return False
    if not event.get("organizer_responsible_user_id"):
        return False
    national_name = str(
        event.get("national_responsible_name") or event.get("responsible_person") or "",
    ).strip()
    if not national_name:
        return False
    email = _national_email(event)
    if not email or not EMAIL_RE.match(email):
        return False
    if not _national_phone(event):
        return False
    if not str(event.get("country") or "").strip():
        return False
    if not str(event.get("region") or "").strip():
        return False
    if not str(event.get("city") or "").strip():
        return False
    kind = infer_activity_kind(
        str(event.get("event_type") or ""),
        str(event.get("title") or ""),
    )
    if kind != "faculty" and not event.get("preparation_theme"):
        return False
    return True

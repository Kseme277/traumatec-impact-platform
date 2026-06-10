"""Clé d'identité participant — dédoublonnage import et historique multi-événements."""

from __future__ import annotations

import re
import unicodedata
from typing import Any


def _normalize_token(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.lower().strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", text)


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def participant_identity_key(
    *,
    email: str | None = None,
    last_name: str | None = None,
    first_name: str | None = None,
    full_name: str | None = None,
    record: dict[str, Any] | None = None,
) -> str:
    """Clé stable : e-mail prioritaire, sinon nom normalisé."""
    src = record or {}
    email_val = _normalize_email(email or src.get("email"))
    if email_val:
        return f"email:{email_val}"

    name = (full_name or src.get("full_name") or "").strip()
    if not name:
        parts = [p for p in (last_name or src.get("last_name"), first_name or src.get("first_name")) if p]
        name = " ".join(parts).strip()
    token = _normalize_token(name)
    return f"name:{token or 'unknown'}"


def dedupe_participant_records(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    """Supprime les doublons dans une liste (même clé d'identité)."""
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    skipped = 0
    for row in rows:
        key = participant_identity_key(record=row)
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        enriched = dict(row)
        enriched["identity_key"] = key
        unique.append(enriched)
    return unique, skipped


def dedupe_for_certificate_generation(
    participants: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    """Un seul certificat par personne (même logique que l'import)."""
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    skipped = 0
    for person in participants:
        stored_key = (person.get("identity_key") or "").strip()
        key = stored_key or participant_identity_key(record=person)
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        unique.append(person)
    return unique, skipped

"""Extraction et formatage email / téléphone du responsable national."""

from __future__ import annotations

import re
from typing import Any

PHONE_IN_TEXT_RE = re.compile(r"\+\d[\d\s]{8,}")
EMAIL_IN_TEXT_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")


def _pick_from_sources(sources: list[dict[str, Any] | None], *keys: str) -> str:
    for src in sources:
        if not isinstance(src, dict):
            continue
        for key in keys:
            value = src.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
    return ""


def extract_contact_fields(event: dict[str, Any]) -> dict[str, str]:
    """Lit email/téléphone depuis metadata_json, excel import ou champs directs."""
    meta = event.get("metadata_json") if isinstance(event.get("metadata_json"), dict) else {}
    excel = meta.get("excel") if isinstance(meta.get("excel"), dict) else {}
    sources = [event, meta, excel]

    email = _pick_from_sources(
        sources,
        "responsible_email",
        "email",
        "courriel",
        "mail",
        "e_mail",
        "contact_email",
    )
    phone = _pick_from_sources(
        sources,
        "responsible_phone",
        "phone",
        "telephone",
        "téléphone",
        "tel",
        "mobile",
        "contact_phone",
    )
    return {"responsible_email": email, "responsible_phone": phone}


def format_contact_from_sample(sample: str, context: dict[str, Any]) -> str | None:
    """Remplace adresse@email et numéros placeholder dans une ligne Courriel/Téléphone."""
    email = (context.get("responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or "").strip()
    if not email and not phone:
        return None

    updated = sample
    if email:
        updated = re.sub(r"adresse@email", email, updated, flags=re.I)
        updated = re.sub(
            rf"({re.escape(email)})\s*(Téléphone:)",
            r"\1 \2",
            updated,
            count=1,
            flags=re.I,
        )

    if phone:
        if PHONE_IN_TEXT_RE.search(updated):
            updated = PHONE_IN_TEXT_RE.sub(phone, updated, count=1)
        elif "téléphone" in updated.lower() or "telephone" in updated.lower():
            updated = re.sub(
                r"(Téléphone:\s*|Telephone:\s*)[^\n\r]*",
                lambda m: f"{m.group(1)}{phone}",
                updated,
                count=1,
                flags=re.I,
            )

    if updated != sample:
        return updated
    if email and phone:
        return f"Courriel: {email}        Téléphone: {phone}"
    if email:
        return f"Courriel: {email}"
    return None


def participants_count_display(context: dict[str, Any]) -> str:
    """Nombre de participants attendu (fiche événement)."""
    raw = context.get("participants_expected")
    if raw is None or raw == "":
        return ""
    try:
        return str(int(raw))
    except (TypeError, ValueError):
        return str(raw).strip()


def format_responsible_sample(sample: str, context: dict[str, Any]) -> str | None:
    """Remplace le nom du responsable en conservant le libellé (Responsable :, etc.)."""
    generator = (context.get("prepared_by_name") or context.get("prepared_by") or "").strip()
    event_resp = (
        context.get("responsible_override")
        or context.get("responsible_formatted")
        or context.get("responsible_person")
        or context.get("responsable")
        or ""
    ).strip()
    # Responsable national de l'événement ; le générateur du paquet n'est utilisé qu'en secours.
    resp = event_resp or generator

    m = re.match(
        r"^(Nombre de participants\s*:\s*)(.*?)(\s+Responsable\s*:\s*)(.+)$",
        sample.strip(),
        re.I,
    )
    if m:
        participants = participants_count_display(context)
        resp_value = resp or m.group(4).strip()
        return f"{m.group(1)}{participants}{m.group(3)}{resp_value}"

    if not resp:
        return None

    m2 = re.match(r"^(Responsable\s*:\s*)(.+)$", sample.strip(), re.I)
    if m2:
        return f"{m2.group(1)}{resp}"

    if re.match(r"^à remplir par le/?\s*la\s+responsable?$", sample.strip(), re.I):
        return None

    if sample.strip().endswith(":") and "responsable" in sample.lower():
        return sample.strip()

    if re.match(r"^per diem pour le responsable$", sample.strip(), re.I):
        return None
    return None


def format_phone_sample(sample: str, context: dict[str, Any]) -> str | None:
    phone = (context.get("responsible_phone") or "").strip()
    if not phone:
        return None
    m = re.match(
        r"^(N°\s*téléphone du responsable national de l'év[eè]nement:\s*)(.+)$",
        sample.strip(),
        re.I,
    )
    if m:
        return f"{m.group(1)}{phone}"
    if PHONE_IN_TEXT_RE.search(sample):
        return PHONE_IN_TEXT_RE.sub(phone, sample, count=1)
    return None

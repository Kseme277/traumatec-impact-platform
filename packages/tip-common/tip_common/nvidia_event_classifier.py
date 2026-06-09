"""Classification événement → paquet AO via NVIDIA NIM (optionnel, clé build.nvidia.com)."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from tip_common.nvidia_client import nvidia_chat_completion
from tip_common.package_types import (
    ALL_PACKAGE_TYPES,
    PACKAGE_TYPE_SPECS,
    _event_duration_days,
    describe_inferred_event_package,
)

logger = logging.getLogger(__name__)

def _rules_fallback(event: dict[str, Any]) -> dict | None:
    result = describe_inferred_event_package(
        preparation_theme=event.get("preparation_theme"),
        event_type=event.get("event_type"),
        title=event.get("title"),
        start_date=event.get("start_date"),
        end_date=event.get("end_date"),
    )
    if result:
        result["classifier"] = "rules"
    return result


def _generation_use_ai() -> bool:
    return os.getenv("DOCGEN_GENERATION_USE_AI", "").lower() in ("1", "true", "yes")


async def classify_event_package(
    event: dict[str, Any],
    *,
    api_key: str | None = None,
    use_ai: bool | None = None,
) -> dict | None:
    """
    Infère le paquet documentaire pour un événement.
    NVIDIA NIM si NVIDIA_API_KEY est défini, sinon règles métier (titre, dates, activité).
    """
    rules = _rules_fallback(event)
    if use_ai is None:
        use_ai = _generation_use_ai()

    # Génération doc : règles métier si thème ou type déjà déductibles (évite 60s+ NVIDIA).
    if not use_ai and rules and rules.get("package_type"):
        return rules

    key = (api_key or os.getenv("NVIDIA_API_KEY") or "").strip()
    if not key:
        return rules

    types_help = ", ".join(
        f"{code} ({spec.activity_label} {spec.label}, thème {spec.preparation_theme}, {spec.duration_days}j)"
        for code, spec in PACKAGE_TYPE_SPECS.items()
    )
    prompt = (
        "Tu classes des événements AO Alliance vers un type de paquet documentaire.\n"
        f"Types valides : {types_help}\n\n"
        f"Activité : {event.get('event_type') or '—'}\n"
        f"Titre : {event.get('title') or '—'}\n"
        f"Thème TIP : {event.get('preparation_theme') or '—'}\n"
        f"Début : {event.get('start_date') or '—'}\n"
        f"Fin : {event.get('end_date') or '—'}\n\n"
        'Réponds UNIQUEMENT en JSON : {"package_type":"ORP_S|ORP_C|OP_C|NONOP_C|IEC_S",'
        '"preparation_theme":"pbo|operatory|iec","confidence":0.9}'
    )

    content, error = await nvidia_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        timeout=60.0,
        api_key=key,
    )
    if not content:
        logger.warning("NVIDIA classifier → règles métier : %s", error)
        return rules

    match = re.search(r"\{[^{}]+\}", content)
    if not match:
        return rules

    try:
        parsed = json.loads(match.group())
    except json.JSONDecodeError:
        return rules

    package_type = str(parsed.get("package_type", "")).upper().replace("-", "_")
    if package_type not in ALL_PACKAGE_TYPES:
        return rules

    spec = PACKAGE_TYPE_SPECS[package_type]
    theme = parsed.get("preparation_theme") or event.get("preparation_theme") or spec.preparation_theme
    return {
        "package_type": package_type,
        "package_label": spec.label,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "preparation_theme": theme,
        "duration_days": _event_duration_days(event.get("start_date"), event.get("end_date")),
        "expected_package_days": spec.duration_days,
        "classifier": "nvidia",
        "confidence": float(parsed.get("confidence", 0.5)),
    }


async def enrich_event_fields_with_ai(event: dict[str, Any]) -> dict[str, str] | None:
    """
    Extrait ville, pays, responsable depuis titre/activité via NVIDIA (optionnel).
    Retourne uniquement les champs à fusionner dans le contexte de génération.
    """
    key = (os.getenv("NVIDIA_API_KEY") or "").strip()
    if not key:
        return None

    prompt = (
        "Tu extrais des champs structurés pour remplir des modèles Word/Excel AO Alliance.\n"
        f"Titre : {event.get('title') or '—'}\n"
        f"Activité : {event.get('event_type') or '—'}\n"
        f"Ville actuelle : {event.get('city') or '—'}\n"
        f"Pays actuel : {event.get('country') or '—'}\n"
        f"Responsable : {event.get('responsible_person') or '—'}\n"
        f"N° projet : {event.get('project_number') or '—'}\n"
        f"Début : {event.get('start_date') or '—'}\n"
        f"Fin : {event.get('end_date') or '—'}\n\n"
        'Réponds UNIQUEMENT en JSON : {"city":"…","country":"…","responsible_person":"…",'
        '"lieu_complet":"…"} — laisse vide si inconnu.'
    )

    content, error = await nvidia_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        timeout=30.0,
    )
    if not content:
        logger.warning("NVIDIA enrichissement contexte → ignoré : %s", error)
        return None

    match = re.search(r"\{[^{}]+\}", content)
    if not match:
        return None
    try:
        parsed = json.loads(match.group())
    except json.JSONDecodeError:
        return None

    result: dict[str, str] = {}
    for field in ("city", "country", "responsible_person"):
        value = str(parsed.get(field, "")).strip()
        if value:
            result[field] = value
    lieu = str(parsed.get("lieu_complet", "")).strip()
    if lieu:
        result["lieu_complet"] = lieu
    return result or None

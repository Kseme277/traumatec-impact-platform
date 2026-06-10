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
    list_package_candidates_for_event,
    normalize_package_type,
)

logger = logging.getLogger(__name__)


def _rules_fallback(event: dict[str, Any]) -> dict | None:
    result = describe_inferred_event_package(
        preparation_theme=event.get("preparation_theme"),
        event_type=event.get("event_type"),
        title=event.get("title"),
        start_date=event.get("start_date"),
        end_date=event.get("end_date"),
        metadata_json=event.get("metadata_json"),
    )
    if result:
        result["classifier"] = "rules"
    return result


def _generation_use_ai() -> bool:
    return os.getenv("DOCGEN_GENERATION_USE_AI", "").lower() in ("1", "true", "yes")


def _apply_ai_choice(
    event: dict[str, Any],
    rules: dict | None,
    package_type: str,
    *,
    confidence: float,
    preparation_theme: str | None = None,
) -> dict | None:
    canonical = normalize_package_type(package_type) or package_type
    if canonical not in PACKAGE_TYPE_SPECS:
        return rules
    spec = PACKAGE_TYPE_SPECS[canonical]
    theme = preparation_theme or event.get("preparation_theme") or spec.preparation_theme
    candidates = list_package_candidates_for_event(
        preparation_theme=theme,
        event_type=event.get("event_type"),
        title=event.get("title"),
        start_date=event.get("start_date"),
        end_date=event.get("end_date"),
        metadata_json=event.get("metadata_json"),
    )
    for item in candidates:
        item["suggested"] = item["package_type"] == canonical
        if item["suggested"]:
            item["score"] = confidence
    return {
        "package_type": canonical,
        "package_label": spec.label,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "preparation_theme": theme,
        "duration_days": _event_duration_days(event.get("start_date"), event.get("end_date")),
        "expected_package_days": spec.duration_days,
        "package_candidates": candidates,
        "classifier": "nvidia",
        "confidence": confidence,
    }


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

    if not use_ai and rules and rules.get("package_type"):
        return rules

    key = (api_key or os.getenv("NVIDIA_API_KEY") or "").strip()
    if not key:
        return rules

    candidates = list_package_candidates_for_event(
        preparation_theme=event.get("preparation_theme"),
        event_type=event.get("event_type"),
        title=event.get("title"),
        start_date=event.get("start_date"),
        end_date=event.get("end_date"),
        metadata_json=event.get("metadata_json"),
    )
    if not candidates:
        return rules

    choices_help = "\n".join(
        f"- {c['package_type']} ({c['package_label']}, thème {c.get('preparation_theme') or 'faculty'}, "
        f"{c['expected_package_days']}j)"
        for c in candidates
    )
    valid_codes = "|".join(c["package_type"] for c in candidates)
    prompt = (
        "Tu classes des événements AO Alliance vers UN type de paquet documentaire.\n"
        "Choisis UNIQUEMENT parmi les options suivantes (format + thème) :\n"
        f"{choices_help}\n\n"
        f"Activité : {event.get('event_type') or '—'}\n"
        f"Titre : {event.get('title') or '—'}\n"
        f"Thème TIP : {event.get('preparation_theme') or '—'}\n"
        f"Début : {event.get('start_date') or '—'}\n"
        f"Fin : {event.get('end_date') or '—'}\n\n"
        f'Réponds UNIQUEMENT en JSON : {{"package_type":"{valid_codes}",'
        '"preparation_theme":"pbo|operatory|iec|null","confidence":0.9}'
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
    allowed = {c["package_type"] for c in candidates}
    if package_type not in allowed:
        return rules

    theme_raw = parsed.get("preparation_theme")
    theme = None if theme_raw in (None, "", "null") else str(theme_raw)
    return _apply_ai_choice(
        event,
        rules,
        package_type,
        confidence=float(parsed.get("confidence", 0.5)),
        preparation_theme=theme,
    )


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

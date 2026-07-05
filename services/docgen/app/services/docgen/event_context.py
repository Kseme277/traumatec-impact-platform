"""Enrichissement du contexte événement pour remplacements docx/xlsx/doc."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from tip_common.package_types import PACKAGE_TYPE_SPECS, effective_list_days


def _parse_iso(value: str | date | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def _infer_location_from_title(title: str) -> dict[str, str]:
    from tip_common.location_fields import infer_location_from_title

    return infer_location_from_title(title)


async def enrich_event_context(
    event: dict[str, Any],
    *,
    package_type: str | None = None,
    classified: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Complète les champs manquants (ville, pays) et ajoute les métadonnées paquet.
    NVIDIA optionnel si clé API présente.
    """
    enriched = dict(event)
    enriched["raw_title"] = str(enriched.get("title") or "")
    title = enriched["raw_title"]

    hints = _infer_location_from_title(title)
    if not enriched.get("city") and hints.get("city"):
        enriched["city"] = hints["city"]
    if not enriched.get("country") and hints.get("country"):
        enriched["country"] = hints["country"]

    if classified:
        for key in ("package_type", "preparation_theme", "package_label"):
            if classified.get(key) and not enriched.get(key):
                enriched[key] = classified[key]

    pkg = package_type or enriched.get("package_type") or (classified or {}).get("package_type")
    if pkg and pkg in PACKAGE_TYPE_SPECS:
        spec = PACKAGE_TYPE_SPECS[pkg]
        enriched["package_type"] = pkg
        enriched["package_label"] = spec.label
        enriched["package_duration_days"] = effective_list_days(
            start_date=enriched.get("start_date"),
            end_date=enriched.get("end_date"),
            package_type=pkg,
            package_max_days=spec.duration_days,
        )
        enriched["package_max_days"] = spec.duration_days
        enriched["activity_label"] = spec.activity_label
        if not enriched.get("preparation_theme"):
            enriched["preparation_theme"] = spec.preparation_theme

    import os

    use_ai = os.getenv("DOCGEN_GENERATION_USE_AI", "").lower() in ("1", "true", "yes")
    if use_ai:
        try:
            from tip_common.nvidia_event_classifier import enrich_event_fields_with_ai

            ai_fields = await enrich_event_fields_with_ai(enriched)
            for key, value in (ai_fields or {}).items():
                if value and not enriched.get(key):
                    enriched[key] = value
        except Exception:
            pass

        try:
            from tip_common.ai_title_formatter import format_event_labels_with_ai

            enriched.update(await format_event_labels_with_ai(enriched))
        except Exception:
            pass

    from tip_common.contact_fields import extract_contact_fields
    from tip_common.title_formatter import format_document_title

    enriched.update(extract_contact_fields(enriched))
    formatted_title = format_document_title(enriched)
    if formatted_title:
        enriched["title_formatted"] = formatted_title

    start = _parse_iso(enriched.get("start_date"))
    end = _parse_iso(enriched.get("end_date"))
    if start and end:
        enriched["event_calendar_days"] = max(1, (end - start).days + 1)

    from tip_common.location_fields import resolve_lieu_display, resolve_lieu_doc_display

    lieu_display = resolve_lieu_display(enriched)
    lieu_doc = resolve_lieu_doc_display(enriched)
    enriched["lieu_formatted"] = lieu_doc or lieu_display

    if start:
        months = (
            "janvier", "février", "mars", "avril", "mai", "juin",
            "juillet", "août", "septembre", "octobre", "novembre", "décembre",
        )
        single = f"{start.day} {months[start.month - 1]} {start.year}"
        if not enriched.get("date_single_formatted"):
            enriched["date_single_formatted"] = single
        if not enriched.get("header_lieu_date") and lieu_doc:
            enriched["header_lieu_date"] = f"{single}\t\t{lieu_doc}"
        if not enriched.get("date_range_formatted"):
            if end and end != start:
                end_single = f"{end.day} {months[end.month - 1]} {end.year}"
                if start.month == end.month and start.year == end.year:
                    enriched["date_range_formatted"] = (
                        f"{start.day} – {end.day} {months[start.month - 1]} {start.year}"
                    )
                else:
                    enriched["date_range_formatted"] = f"{single} – {end_single}"
            else:
                enriched["date_range_formatted"] = single

    return enriched

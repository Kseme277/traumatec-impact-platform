"""Remplacement du texte surligné (jaune) dans les modèles Word AO Alliance."""

from __future__ import annotations

import logging
import re
import zipfile
from datetime import date, timedelta
from io import BytesIO
from typing import Any
from xml.etree import ElementTree as ET

logger = logging.getLogger(__name__)

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

FRENCH_MONTHS = (
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
)
FRENCH_WEEKDAYS = (
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
)


def _parse_iso(value: str | date | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def _format_date_fr(value: date | None) -> str:
    if value is None:
        return ""
    return f"{value.day:02d} {FRENCH_MONTHS[value.month - 1]} {value.year}"


def _format_date_range_fr(start: date | None, end: date | None) -> str:
    if start is None:
        return ""
    end = end or start
    if start == end:
        return _format_date_fr(start)
    if start.month == end.month and start.year == end.year:
        return (
            f"{start.day:02d} – {end.day:02d} "
            f"{FRENCH_MONTHS[start.month - 1]} {start.year}"
        )
    return f"{_format_date_fr(start)} – {_format_date_fr(end)}"


def _format_weekday_date_fr(value: date | None) -> str:
    if value is None:
        return ""
    weekday = FRENCH_WEEKDAYS[value.weekday()]
    return f"{weekday[:1].upper()}{weekday[1:]} {_format_date_fr(value)}"


def _iter_event_days(start: date | None, end: date | None) -> list[date]:
    if start is None:
        return []
    end = end or start
    days: list[date] = []
    cursor = start
    while cursor <= end:
        days.append(cursor)
        cursor += timedelta(days=1)
    return days


def _replacement_from_field_hints(
    text: str,
    context: dict[str, Any],
    replacement_fields: list[dict[str, Any]] | None,
) -> str | None:
    from tip_common.template_field_analyzer import context_value_for_key, format_value_for_field

    stripped = text.strip()
    if not stripped or not replacement_fields:
        return None
    for field in replacement_fields:
        if str(field.get("strategy", "replace")).lower() == "keep":
            continue
        sample = str(field.get("sample", "")).strip()
        if not sample:
            continue
        from tip_common.french_placeholders import is_french_brace_placeholder

        if is_french_brace_placeholder(sample):
            continue
        key = str(field.get("context_key", "")).strip()
        kind = str(field.get("section_kind", "")).lower()
        if key == "title" or kind in {"document_title", "event_header"}:
            if stripped != sample:
                continue
        elif stripped != sample and sample not in stripped and stripped not in sample:
            continue
        value = format_value_for_field(field, context) or context_value_for_key(
            str(field.get("context_key", "")), context
        )
        if value and value != stripped:
            return value
    return None


def _replacement_for_highlight(
    text: str,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> str | None:
    """Retourne le texte de remplacement pour un segment surligné, ou None pour conserver."""
    stripped = text.strip()
    if not stripped:
        return None

    hinted = _replacement_from_field_hints(stripped, context, replacement_fields)
    if hinted:
        return hinted

    start = _parse_iso(context.get("start_date_raw"))
    end = _parse_iso(context.get("end_date_raw"))
    city = (context.get("city") or "").strip()
    country = (context.get("country") or "").strip()
    lieu = ", ".join(part for part in (city, country) if part)

    if re.search(r"\d{2}\s*[–-]\s*\d{2}\s+\w+", stripped) and lieu:
        return f"{_format_date_range_fr(start, end)}          {lieu}"

    if re.search(r"\d{2}\s+\w+\s+\d{4}", stripped) and lieu and len(stripped) < 80:
        if start and end and start != end:
            return f"{_format_date_range_fr(start, end)}       {lieu}"
        return f"{_format_date_fr(start)}       {lieu}"

    for day in _iter_event_days(start, end):
        weekday_line = _format_weekday_date_fr(day)
        if re.match(r"^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b", stripped, re.I):
            if day.strftime("%A").lower()[:3] in stripped.lower()[:10] or stripped[0].lower() in "lmjvsd":
                return weekday_line

    if "hôtel" in stripped.lower() or "hotel" in stripped.lower() or "hôpital" in stripped.lower():
        if lieu:
            return f"Nom de l'hôtel/hôpital, {lieu}"

    if re.match(r"^.+,\s*(Sénégal|Senegal|Gambia|RCA|Congo)\.?$", stripped, re.I):
        if lieu:
            return f"{lieu}." if not lieu.endswith(".") else lieu

    if re.match(r"^Nom de l[’']h[oô]tel/h[oô]pital,", stripped, re.I):
        if lieu:
            return f"Nom de l'hôtel/hôpital, {lieu}"

    if re.match(r"^Nom de l[’']h[oô]pital,\s*.+$", stripped, re.I):
        if lieu:
            return f"Nom de l'hôpital, {lieu}"

    if stripped in {"Nom de l'hôpital, Pays", "Nom de l’hôpital, Pays"}:
        if lieu:
            return f"Nom de l'hôpital, {lieu}"

    if stripped in {"Prénom Nom", "Prénom/ Nom", "Prénom/Nom"}:
        return stripped

    if "adresse@email" in stripped.lower() or (
        "courriel" in stripped.lower() and ("téléphone" in stripped.lower() or "telephone" in stripped.lower())
    ):
        from tip_common.contact_fields import format_contact_from_sample

        contact = format_contact_from_sample(stripped, context)
        if contact:
            return contact

    if context.get("project_number") and stripped.upper() == "TBD":
        return str(context["project_number"])

    return None


def _replace_highlighted_runs(
    root: ET.Element,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> int:
    replaced = 0
    for paragraph in root.iter(f"{{{W_NS}}}p"):
        for run in paragraph.iter(f"{{{W_NS}}}r"):
            rpr = run.find("w:rPr", NS)
            if rpr is None or rpr.find("w:highlight", NS) is None:
                continue
            texts = [node for node in run.iter(f"{{{W_NS}}}t") if node.text]
            if not texts:
                continue
            original = "".join(node.text or "" for node in texts)
            new_text = _replacement_for_highlight(
                original, context, replacement_fields=replacement_fields
            )
            if new_text is None or new_text == original:
                continue
            texts[0].text = new_text
            for extra in texts[1:]:
                extra.text = ""
            replaced += 1
    return replaced


def apply_highlight_replacements_docx(
    data: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    """Remplace le texte surligné dans un .docx selon le contexte événement."""
    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            if "word/document.xml" not in zin.namelist():
                return data
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    root = ET.fromstring(parts["word/document.xml"])
    count = _replace_highlighted_runs(root, context, replacement_fields=replacement_fields)
    if count:
        parts["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    for part_name in list(parts):
        if not part_name.startswith("word/") or not part_name.endswith(".xml"):
            continue
        if part_name == "word/document.xml":
            continue
        try:
            sub_root = ET.fromstring(parts[part_name])
        except ET.ParseError:
            continue
        if _replace_highlighted_runs(sub_root, context, replacement_fields=replacement_fields):
            parts[part_name] = ET.tostring(sub_root, encoding="utf-8", xml_declaration=True)

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    if count:
        logger.info("Surlignages remplacés : %s occurrence(s)", count)
    return repack_docx_archive(data, parts)

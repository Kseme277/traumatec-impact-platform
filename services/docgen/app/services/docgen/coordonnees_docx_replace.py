"""Remplacement ciblé du formulaire coordonnées bancaires (04_Formulaire…docx)."""

from __future__ import annotations

import logging
import re
from typing import Any

from app.services.docgen.document_role_replace import DATE_RANGE_RE, DATE_SINGLE_RE

logger = logging.getLogger(__name__)

_AO_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Cours AOA", "Séminaire AO", "Séminaire AOA")

_LABEL_RE = re.compile(
    r"^(Nom de l.?événement|Lieu de l.?événement|Date de l.?événement|"
    r"Coordonnées bancaires|Veuillez)",
    re.I,
)

_REPLACEABLE_KINDS = frozenset(
    {"document_title", "event_header", "lieu_line", "date_line", "date_lieu_combined"}
)


def _lieu_value(context: dict[str, Any]) -> str:
    city = (context.get("city") or "").strip()
    country = (context.get("country") or "").strip()
    if city and country:
        return f"{city}, {country}"
    return (
        context.get("lieu_formatted")
        or context.get("lieu")
        or context.get("location")
        or city
        or country
        or ""
    ).strip()


def _title_value(context: dict[str, Any]) -> str:
    return (context.get("title_formatted") or context.get("title") or "").strip()


def _date_value(context: dict[str, Any]) -> str:
    return (
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()


def _is_lieu_value(text: str) -> bool:
    stripped = text.strip()
    if not stripped or _LABEL_RE.match(stripped):
        return False
    if DATE_SINGLE_RE.search(stripped):
        return False
    if "," in stripped:
        return len(stripped) <= 80
    return bool(re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,39}", stripped))


def _field_pairs(
    replacement_fields: list[dict[str, Any]] | None,
    context: dict[str, Any],
) -> list[tuple[str, str]]:
    from tip_common.template_field_analyzer import (
        _is_static_label_sample,
        context_value_for_key,
        format_value_for_field,
    )

    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    for field in replacement_fields or []:
        if str(field.get("strategy", "replace")).lower() == "keep":
            continue
        kind = str(field.get("section_kind", "")).lower()
        if kind not in _REPLACEABLE_KINDS:
            continue
        sample = str(field.get("sample", "")).strip()
        if not sample or sample in seen or _is_static_label_sample(sample) or _LABEL_RE.match(sample):
            continue
        key = str(field.get("context_key", "")).strip()
        if key == "title" and kind not in {"document_title", "event_header"}:
            continue
        if key == "title" and not any(m in sample for m in _AO_MARKERS) and len(sample) < 20:
            continue
        value = format_value_for_field(field, context) or context_value_for_key(key, context)
        if not value or sample == value:
            continue
        seen.add(sample)
        pairs.append((sample, value))
    return pairs


def _replace_paragraph(
    text: str,
    context: dict[str, Any],
    *,
    field_map: dict[str, str],
    lieu_done: bool,
) -> tuple[str | None, bool]:
    stripped = text.strip()
    if not stripped or _LABEL_RE.match(stripped):
        return None, lieu_done

    if stripped in field_map:
        updated = field_map[stripped]
        if updated != stripped:
            if _is_lieu_value(stripped) or field_map.get(stripped) == _lieu_value(context):
                if lieu_done:
                    return None, lieu_done
                lieu_done = True
            return updated, lieu_done

    title = _title_value(context)
    if title and any(m in stripped for m in _AO_MARKERS) and len(stripped) > 25:
        if stripped != title:
            return title, lieu_done

    date_val = _date_value(context)
    if date_val and (DATE_SINGLE_RE.fullmatch(stripped) or DATE_RANGE_RE.fullmatch(stripped)):
        if stripped != date_val:
            return date_val, lieu_done

    lieu = _lieu_value(context)
    if lieu and _is_lieu_value(stripped) and stripped != lieu:
        if lieu_done:
            return None, lieu_done
        return lieu, True

    return None, lieu_done


def apply_coordonnees_docx_replacements(
    data: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    import zipfile
    from io import BytesIO
    from xml.etree import ElementTree as ET

    W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

    field_map = {old: new for old, new in _field_pairs(replacement_fields, context)}

    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    replaced = 0
    lieu_done = False
    for part_name, content in list(parts.items()):
        if not part_name.startswith("word/") or not part_name.endswith(".xml"):
            continue
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            continue
        part_count = 0
        for paragraph in root.iter(f"{{{W_NS}}}p"):
            nodes = [
                node
                for run in paragraph.iter(f"{{{W_NS}}}r")
                for node in run.iter(f"{{{W_NS}}}t")
                if node.text is not None or list(run.iter(f"{{{W_NS}}}t"))
            ]
            if not nodes:
                continue
            original = "".join(node.text or "" for node in nodes).strip()
            if not original:
                continue
            updated, lieu_done = _replace_paragraph(
                original,
                context,
                field_map=field_map,
                lieu_done=lieu_done,
            )
            if updated and updated != original:
                nodes[0].text = updated
                for node in nodes[1:]:
                    node.text = ""
                part_count += 1
        if part_count:
            parts[part_name] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            replaced += part_count

    if not replaced:
        return data

    logger.info("Coordonnées bancaires : %s paragraphe(s) mis à jour", replaced)
    out = BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in parts.items():
            zout.writestr(name, content)
    return out.getvalue()

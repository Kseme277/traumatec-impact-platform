"""Remplacement ciblé des formulaires AO en table (coordonnées bancaires, accusé, …)."""

from __future__ import annotations

import logging
import re
import zipfile
from io import BytesIO
from typing import Any
from xml.etree import ElementTree as ET

from app.services.docgen.document_role_replace import DATE_RANGE_RE, DATE_SINGLE_RE
from tip_common.french_label_patterns import (
    DATE_LABEL_RE,
    LEGACY_LIEUX,
    LIEU_LABEL_RE,
    TITRE_OR_NOM_LABEL_RE,
)
from tip_common.location_fields import resolve_lieu_display

logger = logging.getLogger(__name__)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

_AO_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Cours AOA", "Séminaire AO", "Séminaire AOA")

_EVENT_LABEL_RE = re.compile(
    r"\b(év[eéèÈÉ]nement|evenement|aoa|pays|ville|lieu|titre|nom|date)\b",
    re.I,
)

_LEGACY_TITLE_PARTS = (
    "Maintenance et Entretien des Instruments de Traumatologie",
    "Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes",
    "Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes",
    "Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire",
    "Séminaire AO Alliance—",
    "Séminaire AOA—",
)


def _title_value(context: dict[str, Any]) -> str:
    return (context.get("title_formatted") or context.get("title") or "").strip()


def _date_value(context: dict[str, Any]) -> str:
    duration = int(context.get("package_duration_days") or 1)
    if duration > 1:
        return (
            context.get("date_range_formatted")
            or context.get("start_date_long")
            or context.get("date_single_formatted")
            or context.get("start_date")
            or ""
        ).strip()
    return (
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()


def _lieu_value(context: dict[str, Any]) -> str:
    return resolve_lieu_display(context)


def _normalize_label(text: str) -> str:
    return " ".join(text.split())


def _is_event_field_label(text: str) -> bool:
    norm = _normalize_label(text)
    if not norm:
        return False
    if (
        TITRE_OR_NOM_LABEL_RE.search(norm)
        or LIEU_LABEL_RE.search(norm)
        or DATE_LABEL_RE.search(norm)
    ):
        return True
    return bool(_EVENT_LABEL_RE.search(norm) and len(norm) < 90)


def _label_field_key(label: str) -> str | None:
    norm = _normalize_label(label)
    if TITRE_OR_NOM_LABEL_RE.search(norm):
        return "title"
    if LIEU_LABEL_RE.search(norm):
        return "lieu"
    if DATE_LABEL_RE.search(norm):
        return "date"
    return None


def _paragraph_text(paragraph: ET.Element) -> str:
    return "".join(
        (node.text or "")
        for run in paragraph.iter(f"{{{W_NS}}}r")
        for node in run.iter(f"{{{W_NS}}}t")
    )


def _cell_text(cell: ET.Element) -> str:
    parts = [_paragraph_text(paragraph).strip() for paragraph in cell.iter(f"{{{W_NS}}}p")]
    return " ".join(part for part in parts if part).strip()


def _set_paragraph_text(paragraph: ET.Element, new_text: str) -> bool:
    nodes = [
        node
        for run in paragraph.iter(f"{{{W_NS}}}r")
        for node in run.iter(f"{{{W_NS}}}t")
    ]
    if not nodes:
        return False
    nodes[0].text = new_text
    for node in nodes[1:]:
        node.text = ""
    return True


def _set_cell_text(cell: ET.Element, new_text: str) -> bool:
    paragraphs = list(cell.iter(f"{{{W_NS}}}p"))
    if not paragraphs:
        return False
    if not _set_paragraph_text(paragraphs[0], new_text):
        return False
    for extra in paragraphs[1:]:
        _set_paragraph_text(extra, "")
    return True


def _value_for_field(field_key: str, context: dict[str, Any]) -> str:
    if field_key == "title":
        return _title_value(context)
    if field_key == "lieu":
        return _lieu_value(context)
    if field_key == "date":
        return _date_value(context)
    return ""


def _replace_table_rows(root: ET.Element, context: dict[str, Any]) -> int:
    replaced = 0
    for table in root.iter(f"{{{W_NS}}}tbl"):
        for row in table.iter(f"{{{W_NS}}}tr"):
            cells = list(row.iter(f"{{{W_NS}}}tc"))
            if len(cells) < 2:
                continue
            label = _cell_text(cells[0])
            field_key = _label_field_key(label)
            if not field_key:
                continue
            new_value = _value_for_field(field_key, context)
            if not new_value:
                continue
            current = _cell_text(cells[1])
            if current == new_value:
                continue
            if _set_cell_text(cells[1], new_value):
                replaced += 1
    return replaced


def _is_lieu_value(text: str) -> bool:
    stripped = text.strip()
    if not stripped or _is_event_field_label(stripped):
        return False
    if stripped in LEGACY_LIEUX:
        return True
    if DATE_SINGLE_RE.search(stripped) or DATE_RANGE_RE.search(stripped):
        return False
    if "(" in stripped or ")" in stripped:
        return False
    if "," not in stripped:
        return False
    city, country = [part.strip() for part in stripped.split(",", 1)]
    if not city or not country or len(city) > 40 or len(country) > 40:
        return False
    return bool(re.match(r"^[\w\s'.-]+$", city, re.I) and re.match(r"^[\w\s'.-]+$", country, re.I))


def _replace_orphan_paragraphs(root: ET.Element, context: dict[str, Any]) -> int:
    """Remplace les valeurs hors table (titres/lieux/dates isolés)."""
    title = _title_value(context)
    lieu = _lieu_value(context)
    date_val = _date_value(context)
    replaced = 0
    lieu_done = False

    def walk(element: ET.Element, in_cell: bool) -> None:
        nonlocal replaced, lieu_done
        if element.tag == f"{{{W_NS}}}tc":
            in_cell = True
        if element.tag == f"{{{W_NS}}}p" and not in_cell:
            original = _paragraph_text(element).strip()
            if original and not _is_event_field_label(original):
                updated: str | None = None
                if title and any(marker in original for marker in _AO_MARKERS) and len(original) > 20:
                    if original != title and any(part in original for part in _LEGACY_TITLE_PARTS):
                        updated = title
                elif title and original in _LEGACY_TITLE_PARTS:
                    updated = title
                elif date_val and (
                    DATE_SINGLE_RE.fullmatch(original) or DATE_RANGE_RE.fullmatch(original)
                ):
                    if original != date_val:
                        updated = date_val
                elif lieu and original in LEGACY_LIEUX and original != lieu:
                    updated = lieu
                    lieu_done = True
                elif lieu and _is_lieu_value(original) and original != lieu:
                    if not lieu_done:
                        updated = lieu
                        lieu_done = True
                if updated and _set_paragraph_text(element, updated):
                    replaced += 1
        for child in element:
            walk(child, in_cell)

    walk(root, False)
    return replaced


def apply_coordonnees_docx_replacements(
    data: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
    document_role: str | None = None,
) -> bytes:
    del replacement_fields, document_role

    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    replaced = 0
    for part_name, content in list(parts.items()):
        if not part_name.startswith("word/") or not part_name.endswith(".xml"):
            continue
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            continue
        part_count = _replace_table_rows(root, context)
        part_count += _replace_orphan_paragraphs(root, context)
        if part_count:
            parts[part_name] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            replaced += part_count

    if not replaced:
        return data

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    logger.info("Formulaire AO table : %s cellule(s)/paragraphe(s) mis à jour", replaced)
    return repack_docx_archive(data, parts)

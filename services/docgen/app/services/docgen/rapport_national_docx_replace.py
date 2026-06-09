"""Remplacements du rapport national en préservant les styles Word (runs, couleurs, champs formulaire)."""

from __future__ import annotations

import logging
import re
import zipfile
from io import BytesIO
from typing import Any
from xml.etree import ElementTree as ET

from app.services.docgen.document_role_replace import _display_date, _display_title, _lieu_line
from tip_common.contact_fields import participants_count_display

logger = logging.getLogger(__name__)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

_TITRE_LABEL_RE = re.compile(r"^Titre de l[’']événement\s*:\s*$", re.I)
_DATE_LABEL_RE = re.compile(r"^Date\s*:\s*$", re.I)
_LIEU_LABEL_RE = re.compile(r"^Lieu de l[’']événement\s*:\s*$", re.I)
_PARTICIPANTS_LABEL_RE = re.compile(r"^Nombre de participants\s*:\s*$", re.I)
_RESPONSABLE_LABEL_RE = re.compile(r"^Responsable\s*:\s*$", re.I)


def _paragraph_text(paragraph: ET.Element) -> str:
    return "".join(
        (node.text or "")
        for run in paragraph.iter(f"{{{W_NS}}}r")
        for node in run.iter(f"{{{W_NS}}}t")
    )


def _run_plain_text(run: ET.Element) -> str:
    return "".join((node.text or "") for node in run.iter(f"{{{W_NS}}}t"))


def _set_run_text(text_nodes: list[ET.Element], new_text: str) -> None:
    if not text_nodes:
        return
    text_nodes[0].text = new_text
    for node in text_nodes[1:]:
        node.text = ""


def _has_fld_char(run: ET.Element, char_type: str) -> bool:
    for fld in run.iter(f"{{{W_NS}}}fldChar"):
        if fld.get(f"{{{W_NS}}}fldCharType") == char_type:
            return True
    return False


def _replace_form_field_value(runs: list[ET.Element], start_index: int, new_value: str) -> int | None:
    """Remplace le texte affiché du prochain champ FORMTEXT après start_index."""
    saw_begin = False
    saw_separate = False
    display_start: int | None = None

    for index in range(start_index, len(runs)):
        run = runs[index]
        if _has_fld_char(run, "begin"):
            saw_begin = True
        if saw_begin and _has_fld_char(run, "separate"):
            saw_separate = True
            display_start = index + 1
        if saw_separate and _has_fld_char(run, "end"):
            if display_start is not None and display_start < index:
                first_written = False
                for display_index in range(display_start, index):
                    texts = list(runs[display_index].iter(f"{{{W_NS}}}t"))
                    current = "".join(node.text or "" for node in texts)
                    if not current or "FORMTEXT" in current:
                        continue
                    if not first_written:
                        _set_run_text(texts, new_value)
                        first_written = True
                    else:
                        _set_run_text(texts, "")
            return index
    return None


def _replace_plain_value_after_label(
    runs: list[ET.Element],
    label_index: int,
    new_value: str,
) -> bool:
    if not new_value or label_index + 1 >= len(runs):
        return False
    for index in range(label_index + 1, len(runs)):
        texts = list(runs[index].iter(f"{{{W_NS}}}t"))
        current = "".join(node.text or "" for node in texts)
        if not current or "FORMTEXT" in current:
            continue
        _set_run_text(texts, new_value)
        for extra_index in range(index + 1, len(runs)):
            extra_texts = list(runs[extra_index].iter(f"{{{W_NS}}}t"))
            _set_run_text(extra_texts, "")
        return True
    return False


def _apply_labeled_replacements(
    paragraph: ET.Element,
    replacements: list[tuple[re.Pattern[str], str]],
) -> bool:
    runs = list(paragraph.findall(f"{{{W_NS}}}r"))
    cursor = 0
    replaced = False

    for label_re, new_value in replacements:
        if not new_value:
            continue
        while cursor < len(runs):
            text = _run_plain_text(runs[cursor]).strip()
            if label_re.match(text):
                end_index = _replace_form_field_value(runs, cursor + 1, new_value)
                if end_index is not None:
                    replaced = True
                    cursor = end_index + 1
                    break
                if _replace_plain_value_after_label(runs, cursor, new_value):
                    replaced = True
                    cursor += 2
                    break
            cursor += 1

    return replaced


def _event_responsible_name(context: dict[str, Any]) -> str:
    return (
        context.get("responsible_override")
        or context.get("responsible_formatted")
        or context.get("responsible_person")
        or context.get("responsable")
        or ""
    ).strip()


def _replace_paragraph(paragraph: ET.Element, context: dict[str, Any]) -> bool:
    original = _paragraph_text(paragraph).strip()
    if not original:
        return False

    replacements: list[tuple[re.Pattern[str], str]] = []

    if "Titre de l" in original:
        title = _display_title(context)
        if title:
            replacements.append((_TITRE_LABEL_RE, title))

    if "Date" in original:
        date_value = _display_date(context)
        if date_value:
            replacements.append((_DATE_LABEL_RE, date_value))

    if "Lieu de l" in original:
        lieu = _lieu_line(context)
        if lieu:
            replacements.append((_LIEU_LABEL_RE, lieu))

    if "Nombre de participants" in original:
        participants = participants_count_display(context)
        if participants:
            replacements.append((_PARTICIPANTS_LABEL_RE, participants))

    if "Responsable" in original:
        responsible = _event_responsible_name(context)
        if responsible:
            replacements.append((_RESPONSABLE_LABEL_RE, responsible))

    if not replacements:
        return False
    return _apply_labeled_replacements(paragraph, replacements)


def apply_rapport_national_docx_replacements(
    data: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    """Remplace titre, dates, lieu et responsable sans casser la mise en forme du modèle."""
    del replacement_fields
    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            if "word/document.xml" not in zin.namelist():
                return data
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    total = 0
    for part_name in parts:
        if not part_name.startswith("word/") or not part_name.endswith(".xml"):
            continue
        try:
            root = ET.fromstring(parts[part_name])
        except ET.ParseError:
            continue
        part_count = 0
        for paragraph in root.iter(f"{{{W_NS}}}p"):
            if _replace_paragraph(paragraph, context):
                part_count += 1
        if part_count:
            parts[part_name] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            total += part_count

    if not total:
        return data

    out = BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in parts.items():
            zout.writestr(name, content)
    logger.info("Rapport national : %s paragraphe(s) mis à jour (styles préservés)", total)
    return out.getvalue()

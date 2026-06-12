"""Remplacements XML Word (corps, en-têtes, pieds de page)."""

from __future__ import annotations

import logging
import zipfile
from io import BytesIO
from typing import Any
from xml.etree import ElementTree as ET

from app.services.docgen.document_role_replace import replace_line_for_role

logger = logging.getLogger(__name__)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _paragraph_text(paragraph: ET.Element) -> str:
    return "".join(
        (node.text or "")
        for run in paragraph.iter(f"{{{W_NS}}}r")
        for node in run.iter(f"{{{W_NS}}}t")
    )


def _set_paragraph_text(paragraph: ET.Element, new_text: str) -> bool:
    text_nodes = [
        node
        for run in paragraph.iter(f"{{{W_NS}}}r")
        for node in run.iter(f"{{{W_NS}}}t")
        if node.text is not None or list(run.iter(f"{{{W_NS}}}t"))
    ]
    if not text_nodes:
        return False
    text_nodes[0].text = new_text
    for node in text_nodes[1:]:
        node.text = ""
    return True


def _replace_paragraphs_in_root(
    root: ET.Element,
    context: dict[str, Any],
    *,
    document_role: str | None = None,
    day_index: int | None = None,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> int:
    replaced = 0
    for paragraph in root.iter(f"{{{W_NS}}}p"):
        original = _paragraph_text(paragraph).strip()
        if not original or len(original) < 3:
            continue
        new_text = replace_line_for_role(
            original,
            context,
            document_role=document_role,
            day_index=day_index,
            replacement_fields=replacement_fields,
        )
        if new_text and new_text != original and _set_paragraph_text(paragraph, new_text):
            replaced += 1
    return replaced


def apply_role_replacements_docx(
    data: bytes,
    context: dict[str, Any],
    *,
    document_role: str | None = None,
    day_index: int | None = None,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    """Applique les remplacements par rôle sur document.xml, en-têtes et pieds de page."""
    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            if "word/document.xml" not in zin.namelist():
                return data
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    total = 0
    xml_parts = [
        name
        for name in parts
        if name.startswith("word/") and name.endswith(".xml")
    ]
    for part_name in xml_parts:
        try:
            root = ET.fromstring(parts[part_name])
        except ET.ParseError:
            continue
        count = _replace_paragraphs_in_root(
            root,
            context,
            document_role=document_role,
            day_index=day_index,
            replacement_fields=replacement_fields,
        )
        if count:
            parts[part_name] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            total += count

    if not total:
        return data

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    result = repack_docx_archive(data, parts)
    logger.info(
        "Rôle %s : %s paragraphe(s) mis à jour (dont en-têtes)",
        document_role or "?",
        total,
    )
    return result

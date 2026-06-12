"""Remplacements texte dans les anciens fichiers Word .doc (binaire OLE)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _pairs(context: dict[str, Any]) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    mapping = {
        "TBD": context.get("city") or context.get("lieu") or context.get("project_number", ""),
        "Zurich": context.get("city") or "Zurich",
        "[PROJECT_NUMBER]": context.get("project_number", ""),
        "[EVENT_TITLE]": context.get("title", ""),
        "[CITY]": context.get("city", ""),
        "[COUNTRY]": context.get("country", ""),
        "[START_DATE]": context.get("start_date", ""),
        "[END_DATE]": context.get("end_date", ""),
    }
    for old, new in mapping.items():
        if new and old != new:
            items.append((old, str(new)))
    return items


def apply_legacy_doc_replacements(
    doc_bytes: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
    document_role: str | None = None,
) -> bytes:
    """Remplace les chaînes connues en UTF-16 LE / UTF-8 dans un .doc."""
    from tip_common.template_field_analyzer import build_replacement_pairs

    pairs = _pairs(context)
    for old, new in build_replacement_pairs(replacement_fields, context):
        if (old, new) not in pairs:
            pairs.append((old, new))
    if not pairs:
        return doc_bytes

    from app.services.docgen.doc_binary_replace import replace_fixed_width_in_binary

    result = doc_bytes
    replaced = 0
    for old, new in pairs:
        result, count = replace_fixed_width_in_binary(result, old, new)
        replaced += count

    if replaced:
        logger.info("DOC legacy : %s remplacement(s)", replaced)
    return result

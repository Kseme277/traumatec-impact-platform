"""Remplacement ciblé du formulaire budget — uniquement les 4 champs en-tête."""

from __future__ import annotations

import logging
import re
from io import BytesIO
from typing import Any

from openpyxl import load_workbook

from app.services.docgen.excel_cell_utils import cell_value, set_cell_value

logger = logging.getLogger(__name__)

# Libellés colonne B → clé contexte (colonne C uniquement)
_BUDGET_HEADER_LABELS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"responsable\s+national\s+de\s+l.?événement", re.I), "responsible_person"),
    (re.compile(r"titre\s+de\s+l.?événement", re.I), "title"),
    (re.compile(r"date\s+de\s+l.?événement", re.I), "date"),
    (re.compile(r"lieu\s+de\s+l.?événement", re.I), "lieu"),
]


def _context_value(context: dict[str, Any], key: str) -> str:
    if key == "responsible_person":
        return (
            context.get("responsible_formatted")
            or context.get("responsible_person")
            or context.get("responsable")
            or ""
        ).strip()
    if key == "title":
        return (context.get("title_formatted") or context.get("title") or "").strip()
    if key == "date":
        return (
            context.get("date_single_formatted")
            or context.get("start_date_long")
            or context.get("start_date")
            or ""
        ).strip()
    if key == "lieu":
        return (
            context.get("lieu_formatted")
            or context.get("lieu")
            or context.get("location")
            or ""
        ).strip()
    return ""


def _is_label_cell(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    if text.endswith(":"):
        return True
    return any(pattern.search(text) for pattern, _ in _BUDGET_HEADER_LABELS)


def _replace_budget_sheet(sheet, context: dict[str, Any]) -> int:
    replaced = 0
    for row in sheet.iter_rows(min_row=1, max_row=20):
        cells = list(row)
        if len(cells) < 2:
            continue
        for idx, cell in enumerate(cells[:-1]):
            if not isinstance(cell.value, str):
                continue
            label = cell.value.strip()
            if not label:
                continue
            for pattern, ctx_key in _BUDGET_HEADER_LABELS:
                if not pattern.search(label):
                    continue
                value_cell = cells[idx + 1]
                new_value = _context_value(context, ctx_key)
                if not new_value:
                    break
                if cell_value(sheet, value_cell) != new_value:
                    if set_cell_value(sheet, value_cell, new_value):
                        replaced += 1
                break
    return replaced


def apply_budget_excel_replacements(xlsx_bytes: bytes, context: dict[str, Any]) -> bytes:
    """Ne modifie que Responsable / Titre / Date / Lieu (colonne valeur)."""
    try:
        wb = load_workbook(BytesIO(xlsx_bytes))
    except Exception as exc:
        logger.warning("Budget Excel illisible (%s)", exc)
        return xlsx_bytes

    total = 0
    for sheet in wb.worksheets:
        total += _replace_budget_sheet(sheet, context)

    if not total:
        return xlsx_bytes

    logger.info("Budget Excel : %s cellule(s) en-tête mise(s) à jour", total)
    out = BytesIO()
    wb.save(out)
    return out.getvalue()

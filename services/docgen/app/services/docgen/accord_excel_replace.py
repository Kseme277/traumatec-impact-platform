"""Remplacement ciblé de l'accord de collaboration (01_AOA_Accord…xlsx)."""

from __future__ import annotations

import logging
import re
from io import BytesIO
from typing import Any

from openpyxl import load_workbook

from app.services.docgen.document_role_replace import DATE_RANGE_RE, DATE_SINGLE_RE
from app.services.docgen.excel_cell_utils import set_cell_value
from tip_common.french_label_patterns import (
    DEFAULT_DATE_EVENT_PREFIX,
    DEFAULT_LIEU_EVENT_PREFIX,
    DEFAULT_NOM_EVENT_PREFIX,
    DEFAULT_RESP_EMAIL_PREFIX,
    DEFAULT_RESP_NAME_PREFIX,
    DEFAULT_RESP_PHONE_PREFIX,
    EVENT_DATE_LINE_RE,
    EVENT_NAME_LINE_RE,
    LEGACY_LIEUX,
    LIEU_LINE_RE,
    RESP_EMAIL_LINE_RE,
    RESP_NAME_LINE_RE,
    RESP_PHONE_LINE_RE,
)
from tip_common.location_fields import resolve_lieu_display

logger = logging.getLogger(__name__)

_AO_TITLE_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Cours AOA", "Séminaire AO", "Séminaire AOA")
_CONFIRM_RE = re.compile(r"^(Ceci confirme que\s*)(.*)$", re.I)

_INLINE_FIELD_SPECS: list[tuple[re.Pattern[str], str, str, bool]] = [
    (EVENT_NAME_LINE_RE, "title", DEFAULT_NOM_EVENT_PREFIX, False),
    (LIEU_LINE_RE, "lieu", DEFAULT_LIEU_EVENT_PREFIX, True),
    (EVENT_DATE_LINE_RE, "date", DEFAULT_DATE_EVENT_PREFIX, False),
    (RESP_NAME_LINE_RE, "responsible", DEFAULT_RESP_NAME_PREFIX, True),
    (RESP_EMAIL_LINE_RE, "email", DEFAULT_RESP_EMAIL_PREFIX, True),
    (RESP_PHONE_LINE_RE, "phone", DEFAULT_RESP_PHONE_PREFIX, True),
]


def _lieu_value(context: dict[str, Any]) -> str:
    return resolve_lieu_display(context)


def _title_value(context: dict[str, Any]) -> str:
    return (context.get("title_formatted") or context.get("title") or "").strip()


def _date_value(context: dict[str, Any]) -> str:
    duration = int(context.get("package_duration_days") or 1)
    if duration > 1:
        return (
            context.get("date_range_formatted")
            or context.get("start_date_long")
            or context.get("date_single_formatted")
            or ""
        ).strip()
    return (
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()


def _responsible_value(context: dict[str, Any]) -> str:
    return (
        context.get("responsible_formatted")
        or context.get("responsible_person")
        or context.get("responsable")
        or ""
    ).strip()


def _field_value(context: dict[str, Any], key: str) -> str:
    if key == "lieu":
        return _lieu_value(context)
    if key == "title":
        return _title_value(context)
    if key == "date":
        return _date_value(context)
    if key == "responsible":
        return _responsible_value(context)
    if key == "email":
        return (context.get("responsible_email") or "").strip()
    if key == "phone":
        return (context.get("responsible_phone") or "").strip()
    return ""


def _labeled_update(
    text: str,
    line_pattern: re.Pattern[str],
    new_value: str,
    default_prefix: str,
    *,
    always_apply: bool,
) -> str | None:
    """Conserve le libellé d'origine (groupe 1) ou le préfixe par défaut."""
    stripped = text.strip()
    if not stripped:
        return None
    if not always_apply and not new_value:
        return None
    match = line_pattern.match(stripped)
    if match:
        prefix = match.group(1)
        if match.group(2).strip() == new_value:
            return None
        return f"{prefix}{new_value}"
    if ":" in stripped:
        return None
    if not new_value:
        return None
    if stripped == new_value:
        return f"{default_prefix}{new_value}"
    return None


def _replace_standalone_date(text: str, context: dict[str, Any]) -> str | None:
    stripped = text.strip()
    new_date = _date_value(context)
    if not new_date or ":" in stripped:
        return None
    if DATE_SINGLE_RE.fullmatch(stripped) or DATE_RANGE_RE.fullmatch(stripped):
        if stripped == new_date:
            return None
        return f"{DEFAULT_DATE_EVENT_PREFIX}{new_date}"
    return None


def _replace_value_only_cell(text: str, context: dict[str, Any]) -> str | None:
    """Rétablit « Libellé: valeur » si la cellule ne contient que la réponse."""
    stripped = text.strip()
    if not stripped or ":" in stripped:
        return None

    title = _title_value(context)
    lieu = _lieu_value(context)
    date_val = _date_value(context)
    resp = _responsible_value(context)
    email = (context.get("responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or "").strip()

    if title and stripped == title:
        return f"{DEFAULT_NOM_EVENT_PREFIX}{title}"
    if title and any(m in stripped for m in _AO_TITLE_MARKERS) and len(stripped) > 25:
        return f"{DEFAULT_NOM_EVENT_PREFIX}{title}" if title != stripped else None

    if lieu:
        lieu_parts = [part.strip() for part in lieu.split(",")]
        looks_like_lieu = (
            stripped in LEGACY_LIEUX
            or stripped == lieu
            or stripped in lieu_parts
            or any(stripped.lower() == part.lower() for part in lieu_parts)
        )
        if looks_like_lieu:
            labeled = f"{DEFAULT_LIEU_EVENT_PREFIX}{lieu}"
            if labeled != stripped:
                return labeled

    date_only = _replace_standalone_date(stripped, context)
    if date_only:
        return date_only

    if resp and stripped == resp:
        return f"{DEFAULT_RESP_NAME_PREFIX}{resp}"
    if email and stripped == email:
        return f"{DEFAULT_RESP_EMAIL_PREFIX}{email}"
    if phone and stripped == phone:
        return f"{DEFAULT_RESP_PHONE_PREFIX}{phone}"

    return None


def _replace_accord_cell(value: str, context: dict[str, Any]) -> str | None:
    for line_pattern, field_key, default_prefix, always in _INLINE_FIELD_SPECS:
        new_value = _field_value(context, field_key)
        updated = _labeled_update(
            value,
            line_pattern,
            new_value,
            default_prefix,
            always_apply=always,
        )
        if updated is not None:
            return updated

    confirm = _responsible_value(context)
    if confirm:
        updated = _labeled_update(value, _CONFIRM_RE, confirm, "Ceci confirme que ", always_apply=True)
        if updated is not None:
            return updated

    return _replace_value_only_cell(value, context)


def apply_accord_excel_replacements(xlsx_bytes: bytes, context: dict[str, Any]) -> bytes:
    """Met à jour titre, lieu, date et responsable en conservant les libellés du modèle."""
    try:
        wb = load_workbook(BytesIO(xlsx_bytes))
    except Exception as exc:
        logger.warning("Accord Excel illisible (%s)", exc)
        return xlsx_bytes

    replaced = 0
    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if not isinstance(cell.value, str) or not cell.value.strip():
                    continue
                updated = _replace_accord_cell(cell.value, context)
                if updated is not None and set_cell_value(sheet, cell, updated):
                    replaced += 1

    if not replaced:
        return xlsx_bytes

    logger.info("Accord Excel : %s cellule(s) mise(s) à jour (lieu=%s)", replaced, _lieu_value(context))
    out = BytesIO()
    wb.save(out)
    return out.getvalue()

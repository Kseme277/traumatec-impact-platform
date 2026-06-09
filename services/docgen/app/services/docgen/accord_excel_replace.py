"""Remplacement ciblé de l'accord de collaboration (01_AOA_Accord…xlsx)."""

from __future__ import annotations

import logging
import re
from io import BytesIO
from typing import Any

from openpyxl import load_workbook

from app.services.docgen.document_role_replace import DATE_RANGE_RE, DATE_SINGLE_RE

logger = logging.getLogger(__name__)

_LIEU_LINE_RE = re.compile(r"^(Lieu de l.?év[eè]nement:\s*)(.*)$", re.I)
_EVENT_NAME_RE = re.compile(r"^(Nom de l.?év[eè]nement:\s*)(.*)$", re.I)
_EVENT_DATE_RE = re.compile(r"^(Date de l.?év[eè]nement:\s*)(.*)$", re.I)
_RESP_NAME_RE = re.compile(
    r"^(Nom du responsable national de l.?év[eè]nement:\s*)(.*)$",
    re.I,
)
_RESP_EMAIL_RE = re.compile(
    r"^(Email du responsable national de l.?év[eè]nement:\s*)(.*)$",
    re.I,
)
_RESP_PHONE_RE = re.compile(
    r"^(N°\s*téléphone du responsable national de l.?év[eè]nement:\s*)(.*)$",
    re.I,
)
_CONFIRM_RE = re.compile(r"^(Ceci confirme que\s*)(.*)$", re.I)


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


def _replace_labeled_line(
    text: str,
    pattern: re.Pattern[str],
    new_suffix: str,
    *,
    always_apply: bool,
) -> str | None:
    m = pattern.match(text.strip())
    if not m:
        return None
    if not always_apply and not new_suffix:
        return None
    return f"{m.group(1)}{new_suffix}"


def _replace_standalone_date(text: str, context: dict[str, Any]) -> str | None:
    stripped = text.strip()
    new_date = _date_value(context)
    if not new_date:
        return None
    if DATE_SINGLE_RE.fullmatch(stripped):
        return new_date
    if DATE_RANGE_RE.fullmatch(stripped):
        return new_date
    return None


def _replace_accord_cell(value: str, context: dict[str, Any]) -> str | None:
    title = _title_value(context)
    lieu = _lieu_value(context)
    date_val = _date_value(context)
    resp = _responsible_value(context)
    email = (context.get("responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or "").strip()

    for pattern, suffix, always in (
        (_EVENT_NAME_RE, title, False),
        (_LIEU_LINE_RE, lieu, True),
        (_EVENT_DATE_RE, date_val, False),
        (_RESP_NAME_RE, resp, True),
        (_RESP_EMAIL_RE, email, True),
        (_RESP_PHONE_RE, phone, True),
        (_CONFIRM_RE, resp, True),
    ):
        updated = _replace_labeled_line(value, pattern, suffix, always_apply=always)
        if updated is not None and updated != value:
            return updated

    date_only = _replace_standalone_date(value, context)
    if date_only and date_only != value:
        return date_only

    return None


def apply_accord_excel_replacements(xlsx_bytes: bytes, context: dict[str, Any]) -> bytes:
    """Met à jour titre, lieu, date et responsable ; vide si données absentes."""
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
                if updated is not None:
                    cell.value = updated
                    replaced += 1

    if not replaced:
        return xlsx_bytes

    logger.info("Accord Excel : %s cellule(s) mise(s) à jour", replaced)
    out = BytesIO()
    wb.save(out)
    return out.getvalue()

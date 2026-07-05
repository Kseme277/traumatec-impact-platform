"""Remplacements par rôle de document (programme, présences, rapport, …)."""

from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any, Callable

logger = logging.getLogger(__name__)

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

DATE_SINGLE_RE = re.compile(
    r"\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}",
    re.I,
)
DATE_RANGE_RE = re.compile(
    r"\d{1,2}\s*[–\-]\s*\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}",
    re.I,
)
DATE_RANGE_LONG_RE = re.compile(
    r"\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}"
    r"\s*[–\-]\s*"
    r"\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}",
    re.I,
)
LISTE_JOUR_RE = re.compile(r"^(Liste\s+(?:Enseignants|Participants)\s*\()(.+)(\))$", re.I)


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


def _event_day(context: dict[str, Any], day_index: int | None) -> date | None:
    start = _parse_iso(context.get("start_date_raw"))
    if start is None:
        return None
    if day_index is None or day_index < 1:
        return start
    end = _parse_iso(context.get("end_date_raw")) or start
    cursor = start
    target = start + timedelta(days=day_index - 1)
    if target > end:
        return start
    return target


def _lieu_line(context: dict[str, Any]) -> str:
    from tip_common.location_fields import resolve_lieu_doc_display

    return resolve_lieu_doc_display(context)


def _date_for_role(context: dict[str, Any], document_role: str, day_index: int | None) -> str:
    start = _parse_iso(context.get("start_date_raw"))
    end = _parse_iso(context.get("end_date_raw")) or start
    duration = int(context.get("package_duration_days") or 1)
    if document_role in {"presence_enseignants", "presence_participants"} and day_index:
        return _format_date_fr(_event_day(context, day_index))
    if duration == 1 or (start and end and start == end):
        return context.get("start_date_long") or _format_date_fr(start)
    return _format_date_range_fr(start, end)


def _replace_date_in_text(text: str, new_date: str) -> str | None:
    if not new_date:
        return None
    if DATE_RANGE_RE.search(text):
        return DATE_RANGE_RE.sub(new_date, text, count=1)
    if DATE_RANGE_LONG_RE.search(text):
        return DATE_RANGE_LONG_RE.sub(new_date, text, count=1)
    if DATE_SINGLE_RE.search(text):
        return DATE_SINGLE_RE.sub(new_date, text, count=1)
    return None


def _replace_lieu_date_line(text: str, context: dict[str, Any], day_index: int | None) -> str | None:
    """Ex. « Dakar, Sénégal 24 octobre 2026 » ou « Mbour, Sénégal 03 – 05 juin 2026 »."""
    stripped = text.strip()
    if not stripped or len(stripped) < 12:
        return None
    if not (DATE_SINGLE_RE.search(stripped) or DATE_RANGE_RE.search(stripped)):
        return None
    lieu = _lieu_line(context)
    new_date = _date_for_role(context, "presence_enseignants", day_index)
    if not lieu and not new_date:
        return None
    # « Ville, Pays date »
    m = re.match(r"^(.+?)\s+(\d{1,2}\s*.+)$", stripped)
    if m and lieu:
        return f"{lieu} {new_date}".strip()
    if lieu and new_date:
        return f"{lieu} {new_date}"
    return _replace_date_in_text(stripped, new_date)


Replacer = Callable[[str, dict[str, Any], str | None], str | None]


def _display_title(ctx: dict[str, Any]) -> str:
    return (ctx.get("title_formatted") or ctx.get("title") or "").strip()


def _display_date(ctx: dict[str, Any]) -> str:
    return (
        ctx.get("date_single_formatted")
        or ctx.get("start_date_long")
        or ctx.get("start_date")
        or ""
    ).strip()


def _repl_rapport_titre(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    m = re.match(r"^(Titre de l[’']événement\s*:\s*)(.+)$", line.strip(), re.I)
    title = _display_title(ctx)
    if m and title:
        return f"{m.group(1)}{title}"
    return None


def _repl_coordonnees_event_title(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    """Remplace uniquement l'ancien titre séminaire (pas l'en-tête du formulaire)."""
    stripped = line.strip()
    if len(stripped) < 30:
        return None
    if stripped.lower().startswith("coordonnées bancaires"):
        return None
    markers = ("AO Alliance", "AOA—", "AOA-", "Séminaire", "Cours AOA", "Séminaire AO")
    if not any(m in stripped for m in markers):
        return None
    title = _display_title(ctx)
    if title and title != stripped:
        return title
    return None


_BANK_FORM_LABEL_RE = re.compile(
    r"\b(banque|compte|iban|titulaire|swift|bénéficiaire|beneficiaire|adresse|transfert|devise)\b",
    re.I,
)


_COORDONNEES_LABEL_RE = re.compile(
    r"\b(év[eè]nement|aoa|lieu de|nom de l|date de l|pays|ville|svp|veuillez|transfert)\b",
    re.I,
)


def _repl_coordonnees_lieu(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    """Uniquement les lignes « Ville, Pays » (valeur lieu du modèle)."""
    stripped = line.strip()
    if not stripped or "," not in stripped or len(stripped) > 60:
        return None
    if "(" in stripped or ")" in stripped:
        return None
    if DATE_SINGLE_RE.search(stripped) or DATE_RANGE_RE.search(stripped):
        return None
    if _BANK_FORM_LABEL_RE.search(stripped) or _COORDONNEES_LABEL_RE.search(stripped):
        return None
    city, country = [part.strip() for part in stripped.split(",", 1)]
    if not city or not country or len(city) > 40 or len(country) > 40:
        return None
    if not re.match(r"^[\w\s'.-]+$", city, re.I) or not re.match(r"^[\w\s'.-]+$", country, re.I):
        return None
    lieu = _lieu_line(ctx)
    if lieu and lieu != stripped:
        return lieu
    return None


def _repl_coordonnees_date(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    stripped = line.strip()
    if DATE_SINGLE_RE.fullmatch(stripped) or DATE_RANGE_RE.fullmatch(stripped):
        new_date = _display_date(ctx)
        return new_date or None
    return None


def _repl_rapport_date_lieu(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    m = re.match(
        r"^(Date\s*:\s*)(.+?)(\s+Lieu de l[’']événement\s*:\s*)(.+)$",
        line.strip(),
        re.I,
    )
    if not m:
        return None
    new_date = _display_date(ctx) or _date_for_role(ctx, "rapport_national", None)
    lieu = _lieu_line(ctx)
    if not new_date and not lieu:
        return None
    date_part = new_date or m.group(2).strip()
    lieu_part = lieu or m.group(4).strip()
    return f"{m.group(1)}{date_part}{m.group(3)}{lieu_part}"


def _repl_accord_contact(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    from tip_common.contact_fields import format_contact_from_sample, format_phone_sample

    stripped = line.strip()
    contact = format_contact_from_sample(stripped, ctx)
    if contact:
        return contact
    phone_line = format_phone_sample(stripped, ctx)
    if phone_line:
        return phone_line
    return None


def _repl_responsable(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    from tip_common.contact_fields import format_responsible_sample

    updated = format_responsible_sample(line.strip(), ctx)
    if updated:
        return updated
    return None


def _repl_event_title_header(line: str, ctx: dict[str, Any], role: str | None) -> str | None:
    if role not in {"presence_enseignants", "presence_participants", "programme"}:
        return None
    stripped = line.strip()
    title = _display_title(ctx)
    if not title or len(stripped) < 30:
        return None
    markers = _AO_TITLE_MARKERS
    if not any(marker in stripped for marker in markers):
        return None
    if stripped == title:
        return None
    # Uniquement les vrais titres d'événement (pas les paragraphes de corps).
    if len(stripped) > 160:
        return None
    return title


_HOTEL_LIEU_RE = re.compile(
    r"^(Nom de l[’']h[oô]tel/h[oô]pital,\s*)(.+)$",
    re.I,
)
_HOSPITAL_LIEU_RE = re.compile(
    r"^(Nom de l[’']h[oô]pital,\s*)(.+)$",
    re.I,
)


def _repl_programme_hotel_lieu(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    lieu = _lieu_line(ctx)
    if not lieu:
        return None
    for pattern in (_HOTEL_LIEU_RE, _HOSPITAL_LIEU_RE):
        m = pattern.match(line.strip())
        if m and m.group(2).strip() != lieu:
            return f"{m.group(1)}{lieu}"
    return None


def _repl_liste_jour(line: str, ctx: dict[str, Any], day_index: int | None) -> str | None:
    m = LISTE_JOUR_RE.match(line.strip())
    if not m:
        return None
    new_date = _date_for_role(ctx, "presence_enseignants", day_index)
    if new_date:
        return f"{m.group(1)}{new_date}{m.group(3)}"
    return None


def _repl_lieu_date(line: str, ctx: dict[str, Any], day_index: int | None) -> str | None:
    return _replace_lieu_date_line(line, ctx, day_index)


def _repl_date_only(line: str, ctx: dict[str, Any], day_index: int | None) -> str | None:
    roles_date = {
        "coordonnees_bancaires",
        "accuse_paiement",
        "budget",
        "accord_collaboration",
        "rapport_depenses",
        "liste_definitive",
    }
    # utilisé quand le paragraphe ne contient qu'une date
    stripped = line.strip()
    if len(stripped) > 80:
        return None
    if DATE_SINGLE_RE.fullmatch(stripped) or DATE_RANGE_RE.fullmatch(stripped):
        new_date = _date_for_role(ctx, "coordonnees_bancaires", day_index)
        return new_date or None
    return None


def _repl_french_brace_line(line: str, ctx: dict[str, Any], _day: int | None) -> str | None:
    """Remplace les tags {{…}} présents dans une ligne (listes de présence, en-têtes)."""
    stripped = line.strip()
    if not stripped or "{{" not in stripped or "}}" not in stripped:
        return None
    from tip_common.french_placeholders import build_french_placeholder_pairs

    updated = stripped
    for old, new in sorted(build_french_placeholder_pairs(ctx), key=lambda item: -len(item[0])):
        if old in updated:
            updated = updated.replace(old, new)
    return updated if updated != stripped else None


ROLE_REPLACERS: dict[str, list[Replacer]] = {
    "rapport_national": [_repl_rapport_titre, _repl_rapport_date_lieu, _repl_responsable],
    "coordonnees_bancaires": [
        _repl_coordonnees_event_title,
        _repl_coordonnees_lieu,
        _repl_coordonnees_date,
    ],
    "presence_enseignants": [_repl_french_brace_line, _repl_event_title_header, _repl_lieu_date, _repl_liste_jour],
    "presence_participants": [_repl_french_brace_line, _repl_event_title_header, _repl_lieu_date, _repl_liste_jour],
    "programme": [
        _repl_event_title_header,
        _repl_lieu_date,
        _repl_date_only,
        _repl_programme_hotel_lieu,
    ],
    "accuse_paiement": [_repl_date_only, _repl_lieu_date],
    "accord_collaboration": [_repl_date_only, _repl_responsable, _repl_accord_contact],
    "budget": [],
    "rapport_depenses": [_repl_french_brace_line, _repl_date_only],
    "liste_definitive": [_repl_date_only, _repl_event_title_header],
    "badge": [_repl_lieu_date],
}


_STRICT_FORM_ROLES = frozenset(
    {
        "rapport_national",
        "coordonnees_bancaires",
        "budget",
        "accuse_paiement",
        "accord_collaboration",
        "rapport_depenses",
    }
)

_AO_TITLE_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Séminaire AO", "Cours AOA", "Séminaire AOA")

_STRICT_FIELD_SECTION_KINDS = frozenset(
    {
        "lieu_line",
        "date_line",
        "date_lieu_combined",
        "label_field",
    }
)

_PROGRAMME_LIKE_ROLES = frozenset(
    {
        "programme",
        "presence_enseignants",
        "presence_participants",
        "liste_definitive",
        "badge",
    }
)

_PROGRAMME_FIELD_SECTION_KINDS = frozenset(
    {
        "highlight",
        "lieu_line",
        "date_line",
        "date_lieu_combined",
        "placeholder",
        "event_header",
        "document_title",
    }
)


def _programme_field_eligible(field: dict[str, Any]) -> bool:
    if str(field.get("strategy", "replace")).lower() == "keep":
        return False
    sample = str(field.get("sample", "")).strip()
    if not sample:
        return False
    kind = str(field.get("section_kind", "")).lower()
    if kind not in _PROGRAMME_FIELD_SECTION_KINDS:
        return False
    if kind in {"event_header", "document_title"}:
        return any(marker in sample for marker in _AO_TITLE_MARKERS)
    return True


def _programme_fields_for_role(
    replacement_fields: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    return [field for field in (replacement_fields or []) if _programme_field_eligible(field)]


def _strict_field_eligible(field: dict[str, Any]) -> bool:
    if str(field.get("strategy", "replace")).lower() == "keep":
        return False
    sample = str(field.get("sample", "")).strip()
    if not sample:
        return False
    kind = str(field.get("section_kind", "")).lower()
    if kind in _STRICT_FIELD_SECTION_KINDS:
        return True
    if kind in {"event_header", "document_title"}:
        return any(marker in sample for marker in _AO_TITLE_MARKERS)
    return False


def _strict_fields_for_role(
    replacement_fields: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    return [field for field in (replacement_fields or []) if _strict_field_eligible(field)]


def replace_line_for_role(
    line: str,
    context: dict[str, Any],
    *,
    document_role: str | None = None,
    day_index: int | None = None,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> str | None:
    """Retourne le texte remplacé ou None si inchangé."""
    from tip_common.template_field_analyzer import context_value_for_key, format_value_for_field

    stripped = line.strip()
    if not stripped:
        return None

    role = document_role or "autre"
    strict = role in _STRICT_FORM_ROLES
    programme_like = role in _PROGRAMME_LIKE_ROLES
    if strict:
        fields = _strict_fields_for_role(replacement_fields)
    elif programme_like:
        fields = _programme_fields_for_role(replacement_fields)
    else:
        fields = replacement_fields or []

    for field in fields:
        sample = str(field.get("sample", "")).strip()
        if not sample:
            continue
        if strict or programme_like:
            if stripped != sample:
                continue
        elif stripped != sample and sample not in stripped and stripped not in sample:
            continue
        value = format_value_for_field(field, context) or context_value_for_key(
            str(field.get("context_key", "")), context
        )
        if value and value != stripped:
            return value

    for replacer in ROLE_REPLACERS.get(role, []):
        updated = replacer(stripped, context, day_index)
        if updated and updated != stripped:
            return updated

    if not strict and not programme_like:
        updated = _repl_event_title_header(stripped, context, role)
        if updated and updated != stripped:
            return updated

    return None


def excel_cell_replace(
    value: str,
    context: dict[str, Any],
    *,
    document_role: str | None = None,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> str:
    from tip_common.template_field_analyzer import build_replacement_pairs

    updated = value
    for old, new in build_replacement_pairs(replacement_fields, context):
        if old in updated:
            updated = updated.replace(old, new)

    role = document_role or ""
    if role in {"accord_collaboration", "rapport_depenses", "liste_definitive"}:
        # Titre événement dans cellules longues (pas budget : en-tête ciblé)
        if len(updated) > 40 and any(m in updated for m in ("AO Alliance", "AOA—", "Séminaire", "Cours AOA")):
            if updated.strip().startswith("Note importante"):
                return updated
            title = (context.get("title") or "").strip()
            if title and title not in updated:
                return title
        date_repl = _replace_date_in_text(updated, _date_for_role(context, role, None))
        if date_repl:
            return date_repl
        lieu_date = _replace_lieu_date_line(updated, context, None)
        if lieu_date:
            return lieu_date

    date_repl = _replace_date_in_text(updated, _date_for_role(context, role, None))
    if date_repl:
        return date_repl

    return updated

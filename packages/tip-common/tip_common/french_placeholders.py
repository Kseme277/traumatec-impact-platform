"""Paires {{…}} des modèles Word/Excel AO (dossier Template/)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

# Apostrophe ASCII, typographique droite/gauche, backtick (Word)
_APOSTROPHES = ("'", "\u2019", "\u2018", "`")


def _brace(label: str, *, spaced: bool = False) -> str:
    if spaced:
        return f"{{{{ {label.strip()} }}}}"
    return f"{{{{{label}}}}}"


def _event_core_variants() -> list[str]:
    """Variantes « L'évenement » / « l'événement » présentes dans les modèles AO."""
    cores: list[str] = []
    for ap in _APOSTROPHES:
        for article in ("L", "l"):
            for spell in ("évenement", "événement", "evenement", "évènement"):
                cores.append(f"{article}{ap}{spell}")
    return cores


def _date_event_keys() -> list[str]:
    keys: list[str] = []
    for core in _event_core_variants():
        for prefix in ("Date de ", "date de "):
            label = f"{prefix}{core}"
            keys.append(_brace(label))
            keys.append(_brace(label, spaced=True))
    return keys


def _nom_event_keys() -> list[str]:
    keys: list[str] = []
    for core in _event_core_variants():
        for prefix in ("Nom de ", "nom de "):
            label = f"{prefix}{core}"
            keys.append(_brace(label))
            keys.append(_brace(f"{label} "))
            keys.append(_brace(label, spaced=True))
    return keys


def _responsable_org_keys() -> list[str]:
    keys: list[str] = []
    for ap in _APOSTROPHES:
        label = f"responsable de l{ap}organisation"
        keys.append(_brace(label))
        keys.append(_brace(label.capitalize()))
    return keys


def is_french_brace_placeholder(sample: str) -> bool:
    """True si le texte est un placeholder {{…}} des modèles AO (pas une valeur réelle)."""
    text = (sample or "").strip()
    if "{{" not in text or "}}" not in text:
        return False
    lowered = text.lower()
    markers = (
        "ville",
        "pays",
        "nom de",
        "date de",
        "responsable",
        "email",
        "project number",
        "cost center",
        "date du jour",
        "ens.",
    )
    return any(marker in lowered for marker in markers)


def _append_pairs(
    pairs: list[tuple[str, str]],
    keys: list[str],
    value: str,
    *,
    seen: set[str],
) -> None:
    text = str(value or "").strip()
    if not text:
        return
    for key in keys:
        if not key or key in seen or key == text:
            continue
        seen.add(key)
        pairs.append((key, text))


def _lieu_date_line_keys() -> list[str]:
    """Ligne « {{Ville}}, {{Pays}}  {{Date de l'évenement}} » (variantes modèles)."""
    keys: list[str] = []
    seen: set[str] = set()
    for ap in _APOSTROPHES:
        for article in ("L", "l"):
            for spell in ("évenement", "événement", "evenement", "évènement"):
                date_ph = f"Date de {article}{ap}{spell}"
                template = f"{_brace('Ville')}, {_brace('Pays')}  {_brace(date_ph)}"
                if template not in seen:
                    seen.add(template)
                    keys.append(template)
                template_sp = f"{_brace('Ville')}, {_brace('Pays')}  {_brace(date_ph, spaced=True)}"
                if template_sp not in seen:
                    seen.add(template_sp)
                    keys.append(template_sp)
    return keys


def _budget_header_line_keys() -> list[str]:
    """Ligne « {{Nom}}; {{Ville}}, {{Pays}}; {{Date}}; {{Project}}, {{Cost}} » (fichier 10)."""
    keys: list[str] = []
    seen: set[str] = set()
    for ap in _APOSTROPHES:
        for article in ("L", "l"):
            for spell in ("évenement", "événement", "evenement", "évènement"):
                nom = _brace(f"Nom de {article}{ap}{spell}")
                date_ph = _brace(f"Date de {article}{ap}{spell}")
                template = (
                    f"{nom}; {_brace('Ville')}, {_brace('Pays')}; {date_ph}; "
                    f"{_brace('Project Number')}, {_brace('Cost Center')}"
                )
                if template not in seen:
                    seen.add(template)
                    keys.append(template)
    return keys


def build_french_placeholder_pairs(context: dict[str, Any]) -> list[tuple[str, str]]:
    """Construit toutes les paires {{Placeholder FR}} → valeur événement."""
    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()

    title = str(context.get("title_formatted") or context.get("title") or "").strip()
    city = str(context.get("city") or context.get("ville") or "").strip()
    country = str(context.get("country") or context.get("pays") or "").strip()
    date_event = str(
        context.get("date_du_jour")
        or context.get("date_range_formatted")
        or context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()
    date_today = str(
        context.get("date_du_jour")
        or context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()
    if not date_today:
        date_today = datetime.now().strftime("%d/%m/%Y")

    from tip_common.title_formatter import _country_to_fr

    country_fr = (_country_to_fr(country) or country).strip()

    responsible = str(
        context.get("responsible_formatted")
        or context.get("national_responsible_name")
        or context.get("responsible_person")
        or context.get("responsable")
        or ""
    ).strip()
    responsible_national = str(
        context.get("national_responsible_name")
        or context.get("responsible_person")
        or responsible
        or ""
    ).strip()
    email = str(
        context.get("responsible_email") or context.get("national_responsible_email") or ""
    ).strip()
    phone = str(
        context.get("responsible_phone") or context.get("national_responsible_phone") or ""
    ).strip()
    project = str(context.get("project_number") or "").strip()
    cost_center = str(context.get("cost_center") or "").strip()
    org_contact = str(
        context.get("organizer_responsible_name")
        or context.get("prepared_by_name")
        or context.get("prepared_by")
        or ""
    ).strip()
    title_prefix = ""
    for candidate in (responsible, responsible_national):
        for prefix in ("Dr ", "Dr. ", "Pr ", "Pr. ", "Prof ", "Prof. "):
            if candidate.startswith(prefix):
                title_prefix = prefix.strip()
                break
        if title_prefix:
            break

    _append_pairs(pairs, _nom_event_keys(), title, seen=seen)
    _append_pairs(pairs, _date_event_keys(), date_event, seen=seen)
    _append_pairs(pairs, [_brace("Date du jour")], date_today, seen=seen)
    _append_pairs(pairs, [_brace("Ville")], city, seen=seen)
    _append_pairs(pairs, [_brace("Pays")], country_fr, seen=seen)

    if city and country_fr and date_event:
        lieu_line = f"{city}, {country_fr}  {date_event}"
        _append_pairs(pairs, _lieu_date_line_keys(), lieu_line, seen=seen)
    if title and city and country_fr and date_event:
        project = str(context.get("project_number") or "").strip()
        cost_center = str(context.get("cost_center") or "").strip()
        if project or cost_center:
            budget_line = f"{title}; {city}, {country_fr}; {date_event}; {project}, {cost_center}"
            _append_pairs(pairs, _budget_header_line_keys(), budget_line, seen=seen)
    _append_pairs(
        pairs,
        [
            _brace("Nom du Responsable"),
            _brace("Nom du responsable"),
            _brace("Nom du responsable national "),
            _brace("Nom du responsable national"),
        ],
        responsible_national or responsible,
        seen=seen,
    )
    _append_pairs(pairs, [_brace("Email")], email, seen=seen)
    _append_pairs(
        pairs,
        [_brace("Project Number")],
        project,
        seen=seen,
    )
    _append_pairs(pairs, [_brace("Cost Center")], cost_center, seen=seen)
    _append_pairs(
        pairs,
        [
            _brace("Numéro du responsable"),
            _brace(" Numéro du responsable ", spaced=True),
        ],
        phone,
        seen=seen,
    )
    _append_pairs(pairs, _responsable_org_keys(), org_contact, seen=seen)
    if title_prefix:
        _append_pairs(
            pairs,
            [_brace("Dr ou Pr ou rien "), _brace("Dr ou Pr ou rien")],
            title_prefix,
            seen=seen,
        )

    teacher_names = context.get("teacher_names") or []
    if not teacher_names:
        for teacher in context.get("teachers") or []:
            if isinstance(teacher, dict):
                name = f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip()
                if name:
                    teacher_names.append(name)
    for index, name in enumerate(teacher_names[:6], start=1):
        slot = ".." if index == 6 else str(index)
        for ap in _APOSTROPHES:
            _append_pairs(
                pairs,
                [_brace(f"Nom de L{ap}Ens. {slot}")],
                name,
                seen=seen,
            )

    return pairs

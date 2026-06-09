"""Titre événement en français pour les documents AO (sans code projet ni underscores)."""

from __future__ import annotations

import re
from typing import Any

_COUNTRY_FR: dict[str, str] = {
    "rdc": "République démocratique du Congo",
    "democratic republic of the congo": "République démocratique du Congo",
    "congo": "République du Congo",
    "senegal": "Sénégal",
    "sénégal": "Sénégal",
    "rca": "République centrafricaine",
    "côte d'ivoire": "Côte d'Ivoire",
    "cote d'ivoire": "Côte d'Ivoire",
    "cameroon": "Cameroun",
    "cameroun": "Cameroun",
}

_THEME_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"information\s*,?\s*education\s*,?\s*communication|iec", re.I),
        "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
    ),
    (
        re.compile(r"maintenance\s+et\s+entretien", re.I),
        "Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie",
    ),
    (
        re.compile(r"operatory|operatoire|op\s*c", re.I),
        "Cours AO Alliance—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes",
    ),
    (
        re.compile(r"orp|pbo", re.I),
        "Séminaire AO Alliance—Principes du Traitement des Fractures",
    ),
]


def _country_to_fr(fragment: str) -> str:
    key = fragment.strip().lower().replace("_", " ")
    if key in _COUNTRY_FR:
        return _COUNTRY_FR[key]
    if key.endswith("_rdc") or key == "rdc":
        return _COUNTRY_FR["rdc"]
    return fragment.replace("_", " ").strip()


def format_document_title(event: dict[str, Any]) -> str:
    """
    Titre lisible en français pour Word/Excel.
    Évite les codes projet (2026_…_RDC) et les underscores.
    """
    existing = (event.get("title_formatted") or "").strip()
    if existing and "_" not in existing and not re.match(r"^\d{4}_", existing):
        return existing

    raw = (event.get("title") or "").strip()
    if not raw:
        return ""

    text = re.sub(r"^\d{4}_", "", raw)
    parts = [p.strip() for p in re.split(r"_+", text) if p.strip()]
    if not parts:
        parts = [text]

    country_fr = ""
    city = (event.get("city") or "").strip()
    country = (event.get("country") or "").strip()
    if country:
        country_fr = _country_to_fr(country)
    elif len(parts) >= 2:
        country_fr = _country_to_fr(parts[-1])

    body = " ".join(parts[:-1] if len(parts) > 1 and parts[-1].upper() in {"RDC", "RCA", "CDI"} else parts)

    base = ""
    for pattern, label in _THEME_PATTERNS:
        if pattern.search(body) or pattern.search(raw):
            base = label
            break

    if not base:
        cleaned = body.replace("_", " ").strip()
        if re.search(r"séminaire|seminaire", cleaned, re.I):
            base = f"Séminaire AO Alliance—{cleaned}"
        elif re.search(r"cours", cleaned, re.I):
            base = f"Cours AO Alliance—{cleaned}"
        else:
            base = cleaned or raw

    theme = (event.get("preparation_theme") or event.get("theme") or "").strip()
    package = (event.get("package_label") or event.get("package_type") or "").strip()
    if theme == "iec" and "IEC" not in base:
        base = "Séminaire AO Alliance—Information, Éducation et Communication (IEC)"

    lieu = ", ".join(x for x in (city, country_fr or country) if x)
    if lieu and lieu not in base and country_fr and country_fr not in base:
        if "République" in country_fr or "Sénégal" in country_fr:
            base = f"{base} — {country_fr}"

    return re.sub(r"\s+", " ", base).strip()

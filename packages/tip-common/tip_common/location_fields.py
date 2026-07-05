"""Résolution ville / pays / lieu pour les documents AO."""

from __future__ import annotations

import re
from typing import Any

_COUNTRY_SUFFIX_MAP = {
    "_RDC": "Democratic Republic of the Congo",
    "_CDI": "Côte d'Ivoire",
    "_SEN": "Senegal",
    "_CM": "Cameroon",
    "_CMR": "Cameroon",
    "_UGA": "Uganda",
    "_GMB": "Gambia",
    "_TZA": "Tanzania",
    "_TZ": "Tanzania",
}

_KNOWN_COUNTRIES = {
    "tanzania": "Tanzania",
    "uganda": "Uganda",
    "senegal": "Senegal",
    "sénégal": "Sénégal",
    "gambia": "Gambia",
    "cameroon": "Cameroon",
    "cameroun": "Cameroun",
    "congo": "Congo",
    "rca": "RCA",
    "suisse": "Suisse",
    "switzerland": "Switzerland",
    "ethiopia": "Ethiopia",
    "éthiopie": "Éthiopie",
}

_SKIP_TAIL = frozenset(
    {
        "national",
        "course",
        "seminar",
        "seminaire",
        "operatory",
        "pbo",
        "iec",
        "orp",
        "nonop",
        "surgeon",
        "management",
    }
)


def infer_location_from_title(title: str) -> dict[str, str]:
    """Extrait ville et pays depuis un titre projet AO (ex. …_Masaka_Uganda)."""
    result: dict[str, str] = {}
    if not title:
        return result

    upper = title.upper()
    for suffix, country in _COUNTRY_SUFFIX_MAP.items():
        if suffix in upper or upper.endswith(suffix.lstrip("_")):
            result["country"] = country
            break

    if re.search(r"\bTBD\b", title, re.I):
        result.setdefault("city", "TBD")

    if "_" in title:
        parts = [part.strip() for part in title.split("_") if part.strip()]
        if len(parts) >= 2:
            city_candidate = parts[-2]
            country_candidate = parts[-1]
            if (
                re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40}", city_candidate)
                and re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,40}", country_candidate)
                and country_candidate.lower() not in _SKIP_TAIL
                and city_candidate.lower() not in _SKIP_TAIL
                and not country_candidate.isdigit()
            ):
                result.setdefault("city", city_candidate)
                result.setdefault("country", country_candidate)

    comma_tail = re.search(
        r"([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,40}),\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{2,40})\s*$",
        title,
    )
    if comma_tail:
        city_candidate = comma_tail.group(1).strip()
        country_candidate = comma_tail.group(2).strip()
        if city_candidate.lower() not in _SKIP_TAIL and country_candidate.lower() not in _SKIP_TAIL:
            result.setdefault("city", city_candidate)
            result.setdefault(
                "country",
                _KNOWN_COUNTRIES.get(country_candidate.lower(), country_candidate),
            )

    words = title.strip().split()
    if len(words) >= 2:
        country_candidate = words[-1]
        city_candidate = words[-2]
        country_key = country_candidate.lower()
        if (
            country_key in _KNOWN_COUNTRIES
            and city_candidate.lower() not in _SKIP_TAIL
            and re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,40}", city_candidate)
        ):
            result.setdefault("city", city_candidate)
            result.setdefault("country", _KNOWN_COUNTRIES[country_key])

    return result


def resolve_lieu_display(context: dict[str, Any]) -> str:
    """Lieu affichable « Ville, Pays » à partir du contexte événement."""
    city = (context.get("city") or "").strip()
    country = (context.get("country") or "").strip()

    if not city or not country:
        meta = context.get("metadata_json") if isinstance(context.get("metadata_json"), dict) else {}
        excel = meta.get("excel") if isinstance(meta.get("excel"), dict) else {}
        for source in (excel, meta, context):
            if not isinstance(source, dict):
                continue
            city = city or str(source.get("city") or source.get("ville") or source.get("location") or "").strip()
            country = country or str(
                source.get("country") or source.get("pays") or source.get("country_name") or ""
            ).strip()

    if not city or not country:
        hints = infer_location_from_title(
            str(context.get("raw_title") or context.get("title") or context.get("event_title") or "")
        )
        city = city or hints.get("city", "")
        country = country or hints.get("country", "")

    if city and country:
        if city.lower() == country.lower():
            return country
        return f"{city}, {country}"

    return (
        (context.get("lieu_formatted") or "").strip()
        or (context.get("lieu") or "").strip()
        or (context.get("location") or "").strip()
        or (context.get("lieu_complet") or "").strip()
        or city
        or country
    )


_COUNTRY_SHORT_DOC: dict[str, str] = {
    "democratic republic of the congo": "RDC",
    "république démocratique du congo": "RDC",
    "republic of the congo": "Congo",
    "république du congo": "Congo",
    "congo": "Congo",
    "central african republic": "RCA",
    "république centrafricaine": "RCA",
    "rca": "RCA",
    "rdc": "RDC",
    "senegal": "Sénégal",
    "sénégal": "Sénégal",
    "cameroon": "Cameroun",
    "cameroun": "Cameroun",
    "uganda": "Ouganda",
    "tanzania": "Tanzanie",
    "united republic of tanzania": "Tanzanie",
    "gambia": "Gambie",
    "ethiopia": "Éthiopie",
    "éthiopie": "Éthiopie",
    "côte d'ivoire": "C.Ivoire",
    "cote d'ivoire": "C.Ivoire",
    "switzerland": "Suisse",
    "suisse": "Suisse",
}


def country_short_display(country: str, *, max_len: int = 8) -> str:
    """Forme courte du pays pour champs .doc à largeur fixe (ex. {{Pays}} = 8 car.)."""
    text = (country or "").strip()
    if not text:
        return ""
    key = text.lower().replace("_", " ")
    mapped = _COUNTRY_SHORT_DOC.get(key)
    if mapped and len(mapped) <= max_len:
        return mapped
    from tip_common.title_formatter import _country_to_fr

    fr = _country_to_fr(text)
    fr_key = fr.lower()
    mapped_fr = _COUNTRY_SHORT_DOC.get(fr_key)
    if mapped_fr and len(mapped_fr) <= max_len:
        return mapped_fr
    if len(fr) <= max_len:
        return fr
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip()

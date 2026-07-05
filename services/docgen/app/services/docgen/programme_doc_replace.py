"""Remplacements sûrs pour les programmes AO en .doc (binaire OLE)."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_AO_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Cours AOA", "Séminaire AO", "Séminaire AOA")

_LEGACY_SEMINAR_TITLES = (
    "Maintenance et Entretien des Instruments de Traumatologie",
    "Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie",
)

_LEGACY_COMBINED_HEADERS = (
    "24 octobre 2026\t        \t\tDakar, Sénégal",
    "29 mai 2026		   			Bangui, RCA",
    "03 – 05 juin 2026       Mbour, Sénégal",
    "08 – 10 octobre 2026       Brazzaville, Congo",
)

from tip_common.french_label_patterns import LEGACY_LIEUX as _LEGACY_LIEUX

# Apostrophe typographique Word (.doc latin-1 / CP1252).
_DOC_APOSTROPHE = "\x92"
_DOC_APOSTROPHE_CHARS = ("'", "\u2019", "\u2018", "`", _DOC_APOSTROPHE)

# Ligne entête page 1 : {{Date}}       {{Ville}}, {{Pays}} (49 car. dans le modèle IEC)
_COMBINED_HEADER_SPACING = "       "
_COMBINED_HEADER_SKIP = frozenset(
    {
        "{{Pays}}",
        "{{Ville}}",
    }
)

_DATE_IN_TEXT_RE = re.compile(
    r"\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}",
    re.I,
)

# Textes fixes à ne jamais remplacer par le titre.
_STATIC_PREFIXES = (
    "Bienvenue",
    "Veuillez agréer",
    "But du cours",
    "But du séminaire",
    "Audience cible",
    "Les grands chapitres",
    "Objectifs du cours",
    "Collège d",
    "Organisation du cours",
    "Informations générales",
    "Propriété intellectuelle",
    "Sécurité",
    "Téléphones portables",
    "Assurance",
    "Tenue vestimentaire",
    "Langue du cours",
    "Les principes AO",
    "Tous les enseignants",
    "Responsable régional",
    "Responsable national",
    "Enseignants ",
    "Personne de contact",
    "Lieu du cours",
    "Bureau d",
    "Module ",
    "PAUSE",
    "TEMPS",
    "SUJETS",
    "Theaterweg",
    "AO Alliance Foundation",
)

_TITLE_MARKERS = (
    b"S\xe9minaire AO Alliance",
    b"Cours AO Alliance",
    b"S\xe9minaire AOA",
)


def _normalize_for_doc_text(text: str) -> str:
    """Uniformise ponctuation pour remplacements .doc (utf-16-le / latin-1)."""
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u00b4", "'")
        .replace("\u00a0", " ")
    )


def _fit_to_sample_width(sample: str, value: str) -> str | None:
    if not value or not sample:
        return None
    value = _normalize_for_doc_text(value)
    if len(value) > len(sample):
        return None
    if len(value) < len(sample):
        return value + " " * (len(sample) - len(value))
    return value


def _safe_truncate(text: str, max_len: int) -> str:
    """Tronque sans couper un caractère Unicode (évite « Allianceó »)."""
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    if cut and cut[-1] != text[max_len - 1 : max_len]:
        cut = cut.rstrip()
    return cut


def _short_title_for_nom_event(title: str, max_len: int) -> str:
    """Titre court pour le champ « Nom de l'événement » (22–33 car. selon modèle)."""
    title = _normalize_for_doc_text(title.strip())
    if len(title) <= max_len:
        return title
    lowered = title.lower()
    if "information" in lowered and "communication" in lowered and "iec" in lowered:
        short = "Séminaire AO Alliance—IEC"
    elif "maintenance" in lowered and "entretien" in lowered:
        short = "Séminaire AO Alliance—Maint."
    elif "séminaire" in lowered or "seminaire" in lowered:
        short = "Séminaire AO Alliance"
    elif "cours" in lowered:
        short = "Cours AO Alliance"
    else:
        dash = title.find("—")
        if dash > 0:
            short = title[: dash + 1].strip()
        else:
            short = title
    return _safe_truncate(short, max_len)


def _combined_header_templates() -> list[str]:
    templates: list[str] = []
    seen: set[str] = set()
    for ap in _DOC_APOSTROPHE_CHARS:
        for spell in ("évenement", "événement", "evenement", "évènement"):
            date_ph = f"{{{{Date de L{ap}{spell}}}}}"
            template = f"{date_ph}{_COMBINED_HEADER_SPACING}{{{{Ville}}}}, {{{{Pays}}}}"
            if template not in seen:
                seen.add(template)
                templates.append(template)
    return templates


def _build_combined_header_replacement(
    template: str,
    *,
    date_val: str,
    city: str,
    country: str,
) -> str | None:
    """Remplit la ligne date + ville + pays sur la largeur exacte du modèle."""
    from tip_common.location_fields import country_short_display

    date_ph = template.split(_COMBINED_HEADER_SPACING, 1)[0]
    date_width = len(date_ph)
    city_width = len("{{Ville}}")
    country_width = len("{{Pays}}")
    expected = date_width + len(_COMBINED_HEADER_SPACING) + city_width + 2 + country_width
    if len(template) != expected:
        return None

    date_val = _normalize_for_doc_text(date_val.strip())
    city = _normalize_for_doc_text(city.strip())
    country_short = _normalize_for_doc_text(
        country_short_display(country, max_len=country_width)
    )

    if len(date_val) > date_width:
        date_val = _safe_truncate(date_val, date_width)
    date_part = date_val.ljust(date_width)[:date_width]

    if len(city) > city_width:
        city = _safe_truncate(city, city_width)
    city_part = city.ljust(city_width)[:city_width]

    if len(country_short) > country_width:
        country_short = _safe_truncate(country_short, country_width)
    country_part = country_short.ljust(country_width)[:country_width]

    return (
        f"{date_part}{_COMBINED_HEADER_SPACING}{city_part}, {country_part}"
    )


def _combined_header_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []

    from tip_common.location_fields import resolve_lieu_display

    date_val = (
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    )
    date_val = str(date_val).strip()
    city = str(context.get("city") or context.get("ville") or "").strip()
    country = str(context.get("country") or context.get("pays") or "").strip()
    if not city or not country:
        lieu = resolve_lieu_display(context)
        if ", " in lieu:
            city_part, country_part = lieu.split(", ", 1)
            city = city or city_part.strip()
            country = country or country_part.strip()

    if not date_val or not city or not country:
        return []

    pairs: list[tuple[str, str]] = []
    for template in _combined_header_templates():
        if template.encode("utf-16-le") not in doc_bytes:
            continue
        replacement = _build_combined_header_replacement(
            template,
            date_val=date_val,
            city=city,
            country=country,
        )
        if replacement and replacement != template:
            pairs.append((template, replacement))
    return pairs


def _nom_event_templates() -> list[str]:
    templates: list[str] = []
    seen: set[str] = set()
    for ap in _DOC_APOSTROPHE_CHARS:
        for spell in ("évenement", "événement", "evenement", "évènement"):
            for article in ("l", "L"):
                ph = f"{{{{Nom de {article}{ap}{spell}}}}}"
                if ph not in seen:
                    seen.add(ph)
                    templates.append(ph)
    return templates


def _nom_event_blob(doc_bytes: bytes, placeholder: str) -> str | None:
    """Placeholder + retours chariot de padding (zone texte page 1)."""
    needle = placeholder.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    end = idx + len(needle)
    while end + 1 < len(doc_bytes):
        chunk = doc_bytes[end : end + 2]
        if chunk == b"\r\x00":
            end += 2
            continue
        break
    try:
        return doc_bytes[idx:end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None


def _nom_event_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    title = (context.get("title_formatted") or context.get("title") or "").strip()
    if not title:
        return []

    pairs: list[tuple[str, str]] = []
    for placeholder in _nom_event_templates():
        old_blob = _nom_event_blob(doc_bytes, placeholder)
        if not old_blob or old_blob == placeholder:
            continue
        short = _short_title_for_nom_event(title, len(old_blob))
        fitted = _fit_to_sample_width(old_blob, short)
        if fitted and fitted != old_blob:
            pairs.append((old_blob, fitted))
    return pairs


def _pair_same_width(old: str, new: str) -> tuple[str, str] | None:
    """Ne conserve que les remplacements à largeur fixe (pas de troncature)."""
    if not old or not new or old == new:
        return None
    new = _normalize_for_doc_text(new)
    if len(new) > len(old):
        return None
    if len(new) < len(old):
        new = new + " " * (len(old) - len(new))
    return old, new


def _fit_title_blob(old_blob: str, title: str) -> str | None:
    """
    Répartit le titre sur les mêmes lignes (\\r) que le modèle Word.
    Préserve la mise en page de la zone de texte page 1 (évite le décalage image).
    """
    if not old_blob or not title:
        return None
    title = _normalize_for_doc_text(title)
    if "\r" not in old_blob:
        return _fit_to_sample_width(old_blob, title)

    segments = old_blob.split("\r")
    widths = [len(segment) for segment in segments]
    budget = sum(widths)
    chars = list(title[:budget])
    while len(chars) < budget:
        chars.append(" ")
    rebuilt: list[str] = []
    pos = 0
    for width in widths:
        rebuilt.append("".join(chars[pos : pos + width]))
        pos += width
    new_blob = "\r".join(rebuilt)
    if len(new_blob) != len(old_blob):
        return None
    return new_blob


# Cellule 4 du tableau signatures (photo + nom + fonction) — ne pas toucher francophone / Florent Lekina.
_RESPONSIBLE_SIGNATURE_CELL = "Prénom Nom\rResponsable national \x07\x07"
_RESPONSIBLE_SIGNATURE_SUFFIX_FULL = "\rResponsable national \x07\x07"
_RESPONSIBLE_SIGNATURE_SUFFIX_SHORT = "\rResponsable nat. \x07\x07"


def _responsible_signature_pair(
    responsible: str,
    *,
    doc_bytes: bytes | None = None,
) -> tuple[str, str] | None:
    """Nom du responsable dans la 4e colonne uniquement (largeur fixe, tableau intact)."""
    old = _RESPONSIBLE_SIGNATURE_CELL
    if doc_bytes and old.encode("latin-1") not in doc_bytes:
        return None
    if not responsible:
        return None

    responsible = _normalize_for_doc_text(responsible.strip())
    if len(responsible) <= 10:
        new = responsible.ljust(10) + _RESPONSIBLE_SIGNATURE_SUFFIX_FULL
    elif len(responsible) <= 14:
        new = responsible + _RESPONSIBLE_SIGNATURE_SUFFIX_SHORT
    else:
        new = responsible[:14] + _RESPONSIBLE_SIGNATURE_SUFFIX_SHORT
    return _pair_same_width(old, new)


def _extract_title_blobs(doc_bytes: bytes) -> list[str]:
    """Extrait les titres complets tels qu'encodés dans le .doc (latin-1 / CP1252)."""
    blobs: list[str] = []
    seen: set[str] = set()
    for marker in _TITLE_MARKERS:
        idx = 0
        while True:
            start = doc_bytes.find(marker, idx)
            if start < 0:
                break
            end = start
            while end < len(doc_bytes) and end - start < 320:
                if doc_bytes[end : end + 2] == b"\x00\x00":
                    break
                end += 1
            try:
                text = doc_bytes[start:end].decode("latin-1")
            except UnicodeDecodeError:
                idx = start + 1
                continue
            if len(text) < 40 or text in seen:
                idx = start + 1
                continue
            seen.add(text)
            blobs.append(text)
            idx = start + 1
    return blobs


def _combined_header_value(old: str, date_val: str, lieu: str) -> str | None:
    """Conserve tabulations et largeur exacte de la ligne date + lieu (sans espaces en trop)."""
    if not date_val or not lieu:
        return None
    date_match = _DATE_IN_TEXT_RE.search(old)
    if not date_match:
        return None
    old_date = date_match.group(0)
    suffix = old[date_match.end() :]
    updated_suffix = suffix
    for old_lieu in _LEGACY_LIEUX:
        if old_lieu in updated_suffix:
            updated_suffix = updated_suffix.replace(old_lieu, lieu, 1)
            break
    pair = _pair_same_width(old, date_val + updated_suffix)
    return pair[1] if pair else None


def _welcome_block_with_lieu(old: str, lieu: str, old_lieu: str) -> str | None:
    """Phrase d'accueil : ville+pays complets, design du modèle préservé."""
    if old_lieu not in old:
        return None
    new_lieu = _normalize_for_doc_text(lieu)
    new = old.replace(old_lieu, new_lieu)
    if len(new) > len(old):
        new = old.replace("des  Fractures", "des Fractures", 1)
        new = new.replace("Problématique de ", "Problématique ", 1)
        new = new.replace(old_lieu, new_lieu)
    return _pair_same_width(old, new)[1] if _pair_same_width(old, new) else None


def _welcome_lieu_pairs(doc_bytes: bytes, lieu: str) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    for old_lieu in _LEGACY_LIEUX:
        needle = old_lieu.encode("latin-1")
        cursor = 0
        while True:
            idx = doc_bytes.find(needle, cursor)
            if idx < 0:
                break
            cursor = idx + 1
            start = doc_bytes.rfind(b"Probl\xe9matique", max(0, idx - 240), idx)
            if start < 0:
                start = doc_bytes.rfind(b"Sant\xe9 Communautaire", max(0, idx - 120), idx)
            if start < 0:
                continue
            end = idx + len(needle)
            if end < len(doc_bytes) and doc_bytes[end : end + 1] == b".":
                end += 1
            try:
                old = doc_bytes[start:end].decode("latin-1")
            except UnicodeDecodeError:
                continue
            if old in seen or "Probl" not in old and "Communautaire" not in old:
                continue
            new = _welcome_block_with_lieu(old, lieu, old_lieu)
            if new:
                seen.add(old)
                pairs.append((old, new))
    return pairs


def _ville_pays_templates() -> list[str]:
    return ["{{Ville}}, {{Pays}}"]


def _build_ville_pays_replacement(city: str, country: str) -> str | None:
    from tip_common.location_fields import country_short_display

    template = "{{Ville}}, {{Pays}}"
    city_width = len("{{Ville}}")
    country_width = len("{{Pays}}")
    city = _normalize_for_doc_text(city.strip())
    country_short = _normalize_for_doc_text(
        country_short_display(country, max_len=country_width)
    )
    if len(city) > city_width:
        city = _safe_truncate(city, city_width)
    if len(country_short) > country_width:
        country_short = _safe_truncate(country_short, country_width)
    city_part = city.ljust(city_width)[:city_width]
    country_part = country_short.ljust(country_width)[:country_width]
    return f"{city_part}, {country_part}"


def _ville_pays_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    from tip_common.location_fields import country_short_display, resolve_lieu_display

    city = str(context.get("city") or context.get("ville") or "").strip()
    country = str(context.get("country") or context.get("pays") or "").strip()
    if not city or not country:
        lieu = resolve_lieu_display(context)
        if ", " in lieu:
            city_part, country_part = lieu.split(", ", 1)
            city = city or city_part.strip()
            country = country or country_part.strip()
    if not city or not country:
        return []

    pairs: list[tuple[str, str]] = []
    for template in _ville_pays_templates():
        if template.encode("utf-16-le") not in doc_bytes:
            continue
        replacement = _build_ville_pays_replacement(city, country)
        if replacement and replacement != template:
            pairs.append((template, replacement))
    return pairs


def _legacy_template_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    from tip_common.location_fields import resolve_lieu_display

    title = (context.get("title_formatted") or context.get("title") or "").strip()
    lieu = resolve_lieu_display(context)
    date_val = (
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()

    pairs: list[tuple[str, str]] = []

    if title and doc_bytes:
        for old in _extract_title_blobs(doc_bytes):
            if old != title:
                fitted = _fit_title_blob(old, title)
                if fitted and fitted != old:
                    pairs.append((old, fitted))

    if title:
        for old in _LEGACY_SEMINAR_TITLES:
            if old != title:
                fitted = _fit_to_sample_width(old, title)
                if fitted:
                    pairs.append((old, fitted))

    if lieu:
        if doc_bytes:
            pairs.extend(_welcome_lieu_pairs(doc_bytes, lieu))
        for old in _LEGACY_LIEUX:
            if old != lieu:
                pair = _pair_same_width(old, lieu)
                if pair:
                    pairs.append(pair)

    if date_val:
        for old in _LEGACY_COMBINED_HEADERS:
            combined = _combined_header_value(old, date_val, lieu)
            if combined:
                pairs.append((old, combined))
        for old in ("29 mai 2026", "24 octobre 2026", "25 – 27 novembre 2026"):
            if old != date_val:
                pairs.append((old, date_val))

    return pairs


def _build_safe_pairs(
    context: dict[str, Any],
    replacement_fields: list[dict[str, Any]] | None,
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str, int | None]]:
    """Retourne (ancien, nouveau, max_replacements)."""
    from app.services.docgen.document_role_replace import _programme_fields_for_role
    from tip_common.template_field_analyzer import build_replacement_pairs

    fields = _programme_fields_for_role(replacement_fields)
    pairs: list[tuple[str, str]] = _legacy_template_pairs(context, doc_bytes=doc_bytes)
    combined_pairs = _combined_header_pairs(context, doc_bytes=doc_bytes)
    ville_pays_pairs = _ville_pays_pairs(context, doc_bytes=doc_bytes)
    pairs.extend(combined_pairs)
    pairs.extend(ville_pays_pairs)
    pairs.extend(_nom_event_pairs(context, doc_bytes=doc_bytes))
    pairs.extend(build_replacement_pairs(fields, context))

    combined_date_keys = {
        template.split(_COMBINED_HEADER_SPACING, 1)[0] for template, _ in combined_pairs
    }
    skip_placeholder_keys = (
        _COMBINED_HEADER_SKIP | combined_date_keys | frozenset(_ville_pays_templates())
        if combined_pairs or ville_pays_pairs
        else set()
    )

    from tip_common.french_placeholders import build_french_placeholder_pairs

    for old, new in build_french_placeholder_pairs(context):
        if old in skip_placeholder_keys:
            continue
        fitted = _fit_to_sample_width(old, new)
        if fitted and old != fitted and (old, fitted) not in pairs:
            pairs.append((old, fitted))

    title = (context.get("title_formatted") or context.get("title") or "").strip()
    email = (context.get("responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or "").strip()
    responsible = (
        context.get("responsible_formatted")
        or context.get("responsible_person")
        or context.get("responsable")
        or ""
    ).strip()

    extras: list[tuple[str, str]] = []
    if context.get("project_number"):
        extras.append(("TBD", str(context["project_number"])))
    if email and len(email) <= len("adresse@email"):
        extras.append(("adresse@email", email))
    if phone:
        extras.extend(
            [
                (f"Téléphone: +11\xa0111\xa0111\xa0111 111", f"Téléphone: {phone}"),
                ("+11 111 111 111 111", phone),
            ]
        )
    signature_pair = (
        _responsible_signature_pair(responsible, doc_bytes=doc_bytes) if responsible else None
    )
    if signature_pair:
        extras.append(signature_pair)

    for old, new in extras:
        if new and old != new and (old, new) not in pairs:
            pairs.append((old, new))

    limits: dict[str, int | None] = {}
    if signature_pair:
        limits[signature_pair[0]] = 1

    safe: list[tuple[str, str, int | None]] = []
    for old, new in sorted(pairs, key=lambda item: -len(item[0])):
        if not old or not new or old == new:
            continue
        if any(old.startswith(prefix) for prefix in _STATIC_PREFIXES):
            continue
        if old in _LEGACY_LIEUX or old in _LEGACY_SEMINAR_TITLES:
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if old in _LEGACY_COMBINED_HEADERS:
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if any(old == combined for combined, _ in combined_pairs):
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if any(old == vp for vp, _ in ville_pays_pairs):
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if new == title and not any(marker in old for marker in _AO_MARKERS):
            continue
        if len(old) < 8 and new == title:
            continue
        if len(new) > len(old):
            continue
        if old in {p[0] for p in safe}:
            continue
        safe.append((old, new, limits.get(old)))

    return safe


def apply_programme_doc_replacements(
    doc_bytes: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    pairs = _build_safe_pairs(context, replacement_fields, doc_bytes=doc_bytes)
    if not pairs:
        return doc_bytes

    from app.services.docgen.doc_binary_replace import replace_fixed_width_in_binary

    result = doc_bytes
    replaced = 0
    for old, new, max_count in pairs:
        new = _normalize_for_doc_text(new)
        if len(new) > len(old):
            continue
        result, count = replace_fixed_width_in_binary(
            result,
            old,
            new,
            encodings=("utf-16-le", "utf-8", "latin-1"),
            max_replacements=max_count,
        )
        replaced += count

    if replaced:
        logger.info("Programme .doc : %s remplacement(s) sûr(s)", replaced)
    return result

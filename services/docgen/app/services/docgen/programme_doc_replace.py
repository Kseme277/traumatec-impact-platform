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
_COMBINED_HEADER_SUFFIX = "\r\r\x01\r"
_MAX_COMBINED_HEADER_NULL_PREFIX = 4
_MAX_COMBINED_HEADER_REGION_LEN = 120
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
    from tip_common.location_fields import country_doc_display

    date_ph = template.split(_COMBINED_HEADER_SPACING, 1)[0]
    date_width = len(date_ph)
    city_width = len("{{Ville}}")
    country_width = len("{{Pays}}")
    expected = date_width + len(_COMBINED_HEADER_SPACING) + city_width + 2 + country_width
    if len(template) != expected:
        return None

    date_val = _normalize_for_doc_text(date_val.strip())
    city = _normalize_for_doc_text(city.strip())
    tail_budget = len(template) - date_width
    country_display = _normalize_for_doc_text(
        country_doc_display(country, max_len=0)
    )
    content = f"{city}, {country_display}"
    if len(content) > tail_budget - 1:
        content = _truncate_at_word(content, tail_budget - 1)
    spacing = tail_budget - len(content)
    if spacing < 1:
        content = _truncate_at_word(content, tail_budget - 1)
        spacing = tail_budget - len(content)
    if spacing < 1:
        return None

    if len(date_val) > date_width:
        date_val = _safe_truncate(date_val, date_width)
    date_part = date_val.ljust(date_width)[:date_width]

    return f"{date_part}{' ' * spacing}{content}"


def _combined_header_expandable_region(
    doc_bytes: bytes,
    template: str,
) -> tuple[str, int, int] | None:
    """Zone entête page 1 (nulls + contrôles + ligne date/lieu) à largeur binaire fixe."""
    needle = template.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    suffix_b = _COMBINED_HEADER_SUFFIX.encode("utf-16-le")
    end = idx + len(needle)
    if doc_bytes[end : end + len(suffix_b)] != suffix_b:
        return None
    end += len(suffix_b)
    start = idx
    null_prefix = 0
    while start >= 2:
        pair = doc_bytes[start - 2 : start]
        if pair == b"\x00\x00":
            if null_prefix >= _MAX_COMBINED_HEADER_NULL_PREFIX:
                break
            null_prefix += 1
            start -= 2
            continue
        try:
            ch = pair.decode("utf-16-le")
        except UnicodeDecodeError:
            break
        if ch in "\r\t\x08\x01":
            start -= 2
            continue
        break
    try:
        region = doc_bytes[start:end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None
    if len(region) > _MAX_COMBINED_HEADER_REGION_LEN:
        return None
    if len(region) < len(template) + len(_COMBINED_HEADER_SUFFIX) + 8:
        return None
    return region, start, end


def _build_combined_header_expandable_region(
    old_region: str,
    *,
    template: str,
    date_val: str,
    city: str,
    country: str,
) -> str | None:
    """Remplit date + ville + pays complets en consommant le padding binaire de la zone."""
    from tip_common.location_fields import country_doc_display

    if not old_region.endswith(_COMBINED_HEADER_SUFFIX):
        return None
    body = old_region[: -len(_COMBINED_HEADER_SUFFIX)]
    idx = body.rfind(template)
    if idx < 0:
        return None
    before = body[:idx]
    controls = before.lstrip("\x00")
    null_count = len(before) - len(controls)
    line_budget = null_count + len(template)
    if line_budget < len(template):
        return None

    date_val = _normalize_for_doc_text(date_val.strip())
    city = _normalize_for_doc_text(city.strip())
    country_fr = _normalize_for_doc_text(country_doc_display(country, max_len=0))
    location = f"{city}, {country_fr}"
    spacing = max(1, line_budget - len(date_val) - len(location))
    line = f"{date_val}{' ' * spacing}{location}"
    if len(line) > line_budget:
        line = _truncate_at_word(line, line_budget)
    line = line.ljust(line_budget)[:line_budget]
    remaining_nulls = line_budget - len(line)
    new_body = ("\x00" * remaining_nulls) + controls + line
    if len(new_body) != len(body):
        return None
    return new_body + _COMBINED_HEADER_SUFFIX


def _combined_header_expandable_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []

    from tip_common.location_fields import resolve_lieu_display

    date_val = str(
        context.get("date_single_formatted")
        or context.get("start_date_long")
        or context.get("start_date")
        or ""
    ).strip()
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
    seen: set[str] = set()
    for template in _combined_header_templates():
        found = _combined_header_expandable_region(doc_bytes, template)
        if not found:
            continue
        old_region, _, _ = found
        if old_region in seen:
            continue
        new_region = _build_combined_header_expandable_region(
            old_region,
            template=template,
            date_val=date_val,
            city=city,
            country=country,
        )
        if new_region and new_region != old_region:
            seen.add(old_region)
            pairs.append((old_region, new_region))
    return pairs


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


def _fit_line_blob(blob: str, value: str) -> str | None:
    """Remplit une ligne modèle (placeholder + tabulations) à largeur fixe."""
    if not blob or not value:
        return None
    value = _normalize_for_doc_text(value.strip())
    if not value:
        return None
    if len(value) > len(blob):
        value = _safe_truncate(value, len(blob))
    return value.ljust(len(blob))[:len(blob)]


def _placeholder_line_blob(doc_bytes: bytes, placeholder: str) -> str | None:
    """Placeholder enseignant + tabulations/espaces jusqu'au retour chariot."""
    needle = placeholder.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    end = idx + len(needle)
    while end + 1 < len(doc_bytes):
        chunk = doc_bytes[end : end + 2]
        if chunk in (b"\t\x00", b" \x00"):
            end += 2
            continue
        if chunk == b"\r\x00":
            end += 2
            break
        break
    try:
        return doc_bytes[idx:end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None


def _teacher_placeholder_labels(index: int | str) -> list[str]:
    labels: list[str] = []
    for ap in _DOC_APOSTROPHE_CHARS:
        labels.append(f"Nom de L{ap}Ens. {index}")
    return labels


def _teacher_line_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    names = list(context.get("teacher_names") or [])
    if not names:
        for teacher in context.get("teachers") or []:
            if isinstance(teacher, dict):
                name = f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip()
                if name:
                    names.append(name)
    if not names:
        return []

    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    slots: list[int | str] = [1, 2, 3, 4, 5, ".."]
    for slot_index, slot in enumerate(slots):
        name = names[slot_index] if slot_index < len(names) else ""
        for label in _teacher_placeholder_labels(slot):
            placeholder = f"{{{{{label}}}}}"
            blob = _placeholder_line_blob(doc_bytes, placeholder)
            if not blob or blob in seen:
                continue
            fitted = _fit_line_blob(blob, name) if name else _fit_line_blob(blob, " ")
            if fitted and fitted != blob:
                seen.add(blob)
                pairs.append((blob, fitted))
    return pairs


def _welcome_title_fragment(title: str) -> str:
    """Extrait la portion titre après « Séminaire » pour le paragraphe d'accueil."""
    text = _normalize_for_doc_text(title.strip())
    for prefix in ("Séminaire ", "Cours ", "Seminaire ", "Course "):
        if text.lower().startswith(prefix.lower()):
            return text[len(prefix) :].strip()
    return text


def _welcome_paragraph_marker() -> bytes:
    return "Bienvenue au séminaire ".encode("utf-16-le")


def _extract_welcome_paragraph(doc_bytes: bytes) -> str | None:
    marker = _welcome_paragraph_marker()
    idx = doc_bytes.find(marker)
    if idx < 0:
        return None
    try:
        chunk = doc_bytes[idx : idx + 800].decode("utf-16-le")
    except UnicodeDecodeError:
        return None
    end = chunk.find("\r\r")
    if end < 0:
        return None
    para = chunk[:end]
    if "à {{Ville}}, {{Pays}}." not in para:
        return None
    return para


def _compress_welcome_middle(middle: str, budget: int) -> str:
    text = middle
    replacements = (
        ("Problématique de ", "Problématique "),
        (" de Prise en Charge des Fractures", " prise en charge fractures"),
        (" de Prise en Charge des ", " prise en charge "),
        (" des Fractures", " fractures"),
        (" des agents de santé", " agents de santé"),
        (" des agents", " agents"),
        (" des ", " "),
        (" de ", " "),
        ("Prise en Charge", "Prise en charge"),
        ("Fractures", "fractures"),
    )
    while len(text) > budget:
        changed = False
        for old, new in replacements:
            if old in text and len(text.replace(old, new, 1)) <= budget:
                text = text.replace(old, new, 1)
                changed = True
                break
            if old in text:
                text = text.replace(old, new, 1)
                changed = True
                break
        if not changed:
            break
    if "communaut" in text and "communautaire" not in text:
        text = text.replace("communaut", "communautaire")
    if text.endswith("comm"):
        text = text[:-4] + "communautaire"
    return text[:budget].ljust(budget)


def _build_welcome_paragraph_replacement(
    old_para: str,
    *,
    title: str,
    city: str,
    country: str,
) -> str | None:
    """Paragraphe d'accueil : corps du modèle intact, ville et pays les plus complets possibles."""
    from tip_common.title_formatter import _country_to_fr

    marker = "à {{Ville}}, {{Pays}}."
    if marker not in old_para:
        return None

    prefix = "Bienvenue au séminaire "
    if not old_para.startswith(prefix):
        return None

    sep_idx = old_para.find("\xa0:")
    if sep_idx < 0:
        return None
    old_middle = old_para[sep_idx + 2 : old_para.index(marker)]

    country_full = _normalize_for_doc_text(_country_to_fr(country) or country.strip())
    city = city.strip()
    title_part = _welcome_title_fragment(title)
    ending = f"à {city}, {country_full}."
    middle = old_middle

    def _total_len() -> int:
        return len(prefix) + len(title_part) + 2 + len(middle) + len(ending)

    while _total_len() > len(old_para) and len(title_part) > 8:
        title_part = _truncate_at_word(title_part, max(8, len(title_part) - 1))

    while _total_len() > len(old_para) and len(middle) > len(old_middle.strip()):
        middle = middle[:-1]

    while _total_len() > len(old_para) and len(ending) > len(marker):
        inner = ending[len(f"à {city}, ") : -1]
        inner = _truncate_at_word(inner, max(4, len(inner) - 1))
        ending = f"à {city}, {inner}."

    if _total_len() > len(old_para):
        return None

    pad = len(old_para) - _total_len()
    if pad > 0:
        middle = middle + (" " * pad)

    new_para = f"{prefix}{title_part}\xa0:{middle}{ending}"
    return new_para if len(new_para) == len(old_para) else None


def _welcome_paragraph_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    title = (context.get("title_formatted") or context.get("title") or "").strip()
    city = str(context.get("city") or context.get("ville") or "").strip()
    country = str(context.get("country") or context.get("pays") or "").strip()
    if not title or not city or not country:
        from tip_common.location_fields import resolve_lieu_display

        if not city or not country:
            lieu = resolve_lieu_display(context)
            if ", " in lieu:
                city_part, country_part = lieu.split(", ", 1)
                city = city or city_part.strip()
                country = country or country_part.strip()
    if not title or not city or not country:
        return []

    old_para = _extract_welcome_paragraph(doc_bytes)
    if not old_para:
        return []
    new_para = _build_welcome_paragraph_replacement(
        old_para,
        title=title,
        city=city,
        country=country,
    )
    if new_para and new_para != old_para:
        return [(old_para, new_para)]
    return []


def _welcome_seminar_title_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    """Remplace le titre séminaire hardcodé dans « Bienvenue au séminaire … »."""
    if not doc_bytes:
        return []
    title = _welcome_title_fragment(
        (context.get("title_formatted") or context.get("title") or "").strip()
    )
    if not title:
        return []

    marker = "Bienvenue au séminaire ".encode("utf-16-le")
    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    cursor = 0
    while True:
        idx = doc_bytes.find(marker, cursor)
        if idx < 0:
            break
        start = idx + len(marker)
        try:
            chunk = doc_bytes[start : start + 600].decode("utf-16-le")
        except UnicodeDecodeError:
            cursor = start + 2
            continue
        sep = chunk.find("\xa0:")
        if sep < 0:
            sep = chunk.find(": Probl")
        if sep < 0:
            cursor = start + 2
            continue
        old_title = chunk[:sep]
        if len(old_title) < 12 or old_title in seen:
            cursor = start + sep * 2
            continue
        new_title = _normalize_for_doc_text(title)
        if len(new_title) > len(old_title):
            new_title = _safe_truncate(new_title, len(old_title))
        new_title = new_title.ljust(len(old_title))[: len(old_title)]
        if new_title != old_title:
            seen.add(old_title)
            pairs.append((old_title, new_title))
        cursor = start + sep * 2
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
    """Placeholder + zone texte page 1 (lignes \\r / contrôles Word)."""
    needle = placeholder.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    end = idx + len(needle)
    while end + 1 < len(doc_bytes):
        chunk = doc_bytes[end : end + 2]
        if chunk in (b"\r\x00", b"\x01\x00"):
            end += 2
            continue
        break
    try:
        return doc_bytes[idx:end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None


def _nom_event_expandable_region(doc_bytes: bytes, placeholder: str) -> tuple[str, int, int] | None:
    """Zone « Nom de l'événement » + padding \\x00 exploitable sans changer la taille du .doc."""
    needle = placeholder.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    end = idx + len(needle)
    while end + 1 < len(doc_bytes):
        chunk = doc_bytes[end : end + 2]
        if chunk in (b"\r\x00", b"\x01\x00"):
            end += 2
            continue
        break
    null_end = end
    while null_end + 1 < len(doc_bytes) and doc_bytes[null_end : null_end + 2] == b"\x00\x00":
        null_end += 2
    if null_end <= end:
        return None
    try:
        region = doc_bytes[idx:null_end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None
    if len(region) < 48:
        return None
    return region, idx, null_end


def _nom_event_control_suffix(blob: str) -> str:
    """Partie contrôles Word après le placeholder (\\r, \\x01)."""
    for ap in _DOC_APOSTROPHE_CHARS:
        for spell in ("évenement", "événement", "evenement", "évènement"):
            marker = f"{{{{Nom de l{ap}{spell}}}}}"
            if blob.startswith(marker):
                return blob[len(marker) :]
    return ""


def _build_nom_event_expandable_region(old_region: str, title: str) -> str | None:
    """Insère le titre complet dans la zone texte page 1 (consomme le padding binaire)."""
    if not old_region or not title:
        return None
    title = _normalize_for_doc_text(title.strip())
    suffix = _nom_event_control_suffix(old_region.split("\x00", 1)[0])
    if not suffix:
        suffix = "\r\r\r\r\r\r\r\r\r\r\r\x01\r\r\r\r"
    max_len = len(old_region)
    if len(title) + len(suffix) > max_len:
        title = _truncate_at_word(title, max(8, max_len - len(suffix)))
    content = (title + suffix)[:max_len]
    if len(content) < max_len:
        content = content + "\x00" * (max_len - len(content))
    return content if len(content) == max_len else None


def _nom_event_expandable_pairs(
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
    seen: set[str] = set()
    for placeholder in _nom_event_templates():
        found = _nom_event_expandable_region(doc_bytes, placeholder)
        if not found:
            continue
        old_region, _, _ = found
        if old_region in seen:
            continue
        new_region = _build_nom_event_expandable_region(old_region, title)
        if new_region and new_region != old_region:
            seen.add(old_region)
            pairs.append((old_region, new_region))
    return pairs


def _fit_textbox_blob(old_blob: str, text: str) -> str | None:
    """Remplit la zone « Nom de l'événement » (1re ligne) sans modifier la taille du blob."""
    if not old_blob or not text:
        return None
    text = _normalize_for_doc_text(text.strip())
    parts = old_blob.split("\r")
    if not parts or not parts[0]:
        return None

    line_width = len(parts[0])
    if line_width < 8:
        return None

    # Les lignes vides (\r consécutifs) ne peuvent pas être étendues en binaire : 1re ligne seulement.
    first = _truncate_at_word(text, line_width).ljust(line_width)[:line_width]
    new_blob = first + old_blob[line_width:]
    return new_blob if len(new_blob) == len(old_blob) else None


def _find_utf16_blob(doc_bytes: bytes, sample: str) -> str | None:
    needle = sample.encode("utf-16-le")
    idx = doc_bytes.find(needle)
    if idx < 0:
        return None
    end = idx + len(needle)
    while end + 1 < len(doc_bytes):
        chunk = doc_bytes[end : end + 2]
        if chunk in (b"\t\x00", b" \x00"):
            end += 2
            continue
        if chunk == b"\r\x00":
            end += 2
            continue
        break
    try:
        return doc_bytes[idx:end].decode("utf-16-le")
    except UnicodeDecodeError:
        return None


def _contact_section_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    """Personne de contact (programme IEC .doc) : nom, courriel, téléphone."""
    if not doc_bytes:
        return []

    responsible = (
        context.get("responsible_formatted")
        or context.get("responsible_person")
        or context.get("responsable")
        or context.get("national_responsible_name")
        or ""
    ).strip()
    email = (context.get("responsible_email") or context.get("national_responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or context.get("national_responsible_phone") or "").strip()

    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()

    for sample in ("Prénom/ Nom", "Prénom Nom", "Prénom/Nom"):
        blob = _find_utf16_blob(doc_bytes, sample)
        if not blob or blob in seen or not responsible:
            continue
        fitted = _fit_line_blob(blob, responsible)
        if fitted and fitted != blob:
            seen.add(blob)
            pairs.append((blob, fitted))

    for sample in (
        "Courriel : xxxxx@email.com",
        "Courriel: xxxxx@email.com",
        "Courriel : adresse@email",
        "Courriel: adresse@email",
        "Courriel: adresse@emailTéléphone: +11 111 111 111 111",
    ):
        blob = _find_utf16_blob(doc_bytes, sample)
        if not blob or blob in seen or not email:
            continue
        from tip_common.contact_fields import format_contact_from_sample

        fitted = format_contact_from_sample(blob, {**context, "responsible_email": email, "responsible_phone": phone})
        if not fitted:
            fitted = _fit_line_blob(blob, f"Courriel : {email}")
        if fitted and len(fitted) <= len(blob):
            fitted = fitted.ljust(len(blob))[: len(blob)]
        if fitted and fitted != blob:
            seen.add(blob)
            pairs.append((blob, fitted))

    for sample in (
        "Téléphone : +xx xxx xxx xxx",
        "Telephone : +xx xxx xxx xxx",
        "Téléphone: +11 111 111 111 111",
        "+xx xxx xxx xxx",
    ):
        blob = _find_utf16_blob(doc_bytes, sample)
        if not blob or blob in seen or not phone:
            continue
        from tip_common.contact_fields import format_contact_from_sample, format_phone_sample

        fitted = format_phone_sample(blob, context) or format_contact_from_sample(blob, context)
        if not fitted:
            prefix = "Téléphone : " if "Téléphone" in blob or "Telephone" in blob else ""
            fitted = _fit_line_blob(blob, f"{prefix}{phone}".strip())
        if fitted and len(fitted) <= len(blob):
            fitted = fitted.ljust(len(blob))[: len(blob)]
        if fitted and fitted != blob:
            seen.add(blob)
            pairs.append((blob, fitted))

    return pairs


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
        first = old_blob.split("\r", 1)[0]
        display_title = _programme_title_for_width(title, len(first))
        fitted = _fit_textbox_blob(old_blob, display_title)
        if not fitted and old_blob:
            line = _programme_title_for_width(title, len(first)).ljust(len(first))[: len(first)]
            fitted = line + old_blob[len(first) :]
            if len(fitted) != len(old_blob):
                fitted = None
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


def _truncate_at_word(text: str, max_len: int) -> str:
    """Tronque à la dernière frontière de mot (évite « Informatio »)."""
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    if max_len < len(text) and text[max_len : max_len + 1].isalnum() and cut and cut[-1].isalnum():
        last_space = cut.rfind(" ")
        if last_space > max(8, max_len // 3):
            cut = cut[:last_space]
    return cut.rstrip()


def _programme_title_for_width(title: str, budget: int) -> str:
    """Titre lisible pour une zone à largeur fixe (programme page 1)."""
    title = _normalize_for_doc_text(title.strip())
    if len(title) <= budget:
        return title
    lowered = title.lower()
    if "information" in lowered and "communication" in lowered and "iec" in lowered:
        candidates = (
            "Séminaire AO Alliance—IEC",
            "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
            "Séminaire AO Alliance—Information, Éducation et Communication",
            "Séminaire AO Alliance—Information et Communication (IEC)",
            "Séminaire AO Alliance",
        )
        for candidate in candidates:
            if len(candidate) <= budget:
                return candidate
    short = _short_title_for_nom_event(title, budget)
    if len(short) <= budget:
        return short
    return _truncate_at_word(title, budget)


def _fit_title_blob(old_blob: str, title: str) -> str | None:
    """
    Répartit le titre sur les mêmes lignes (\\r) que le modèle Word.
    Préserve la mise en page de la zone de texte page 1 (évite le décalage image).
    """
    if not old_blob or not title:
        return None
    title = _normalize_for_doc_text(title)
    if "\r" not in old_blob:
        fitted = _fit_to_sample_width(old_blob, _truncate_at_word(title, len(old_blob)))
        return fitted

    segments = old_blob.split("\r")
    widths = [len(segment) for segment in segments]
    # Lignes vides = même largeur que la première ligne (zone texte Word).
    if widths and widths[0] > 0:
        widths = [widths[0] if width == 0 else width for width in widths]

    words = title.split()
    lines: list[list[str]] = [[] for _ in segments]
    line_idx = 0
    for word in words:
        candidate = " ".join([*lines[line_idx], word]).strip()
        if line_idx < len(widths) and len(candidate) <= widths[line_idx]:
            lines[line_idx].append(word)
            continue
        if line_idx + 1 < len(lines):
            line_idx += 1
            lines[line_idx] = [word]
        else:
            lines[line_idx].append(word)

    rebuilt: list[str] = []
    for index, width in enumerate(widths):
        line = " ".join(lines[index]).strip()
        if len(line) > width:
            line = _truncate_at_word(line, width)
        rebuilt.append(line.ljust(width)[:width])

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


def _welcome_ville_pays_templates() -> list[str]:
    return ["à {{Ville}}, {{Pays}}.\r\r", "à {{Ville}}, {{Pays}}."]


def _build_welcome_lieu_replacement(city: str, country: str, template: str) -> str | None:
    """Phrase d'accueil « à Ville, Pays. » (largeur fixe du modèle)."""
    from tip_common.location_fields import country_doc_display

    marker = "à {{Ville}}, {{Pays}}."
    if not template.startswith(marker):
        return None

    city = _normalize_for_doc_text(city.strip())
    location_template = "{{Ville}}, {{Pays}}"
    country_display = _normalize_for_doc_text(
        country_doc_display(country, max_len=0)
    )
    location = f"{city}, {country_display}"
    if len(location) > len(location_template):
        location = _truncate_at_word(location, len(location_template))
    location = location.ljust(len(location_template))[: len(location_template)]
    value = f"à {location}."
    if len(value) < len(marker):
        value = value.ljust(len(marker))
    suffix = template[len(marker) :]
    value = (value + suffix)[: len(template)]
    if len(value) != len(template):
        return None
    return value


def _welcome_ville_pays_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    from tip_common.location_fields import resolve_lieu_display

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
    for template in _welcome_ville_pays_templates():
        if template.encode("utf-16-le") not in doc_bytes:
            continue
        replacement = _build_welcome_lieu_replacement(city, country, template)
        if replacement and replacement != template:
            pairs.append((template, replacement))
    return pairs


def _build_ville_pays_replacement(city: str, country: str) -> str | None:
    from tip_common.location_fields import country_doc_display

    template = "{{Ville}}, {{Pays}}"
    city = _normalize_for_doc_text(city.strip())
    country_display = _normalize_for_doc_text(
        country_doc_display(country, max_len=0)
    )
    value = f"{city}, {country_display}"
    if len(value) > len(template):
        value = _truncate_at_word(value, len(template))
    return value.ljust(len(template))[: len(template)]


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


def _build_expandable_pairs(
    context: dict[str, Any],
    *,
    doc_bytes: bytes | None = None,
) -> list[tuple[str, str]]:
    if not doc_bytes:
        return []
    return _nom_event_expandable_pairs(context, doc_bytes=doc_bytes)


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
    pairs: list[tuple[str, str]] = []
    nom_expandable = _nom_event_expandable_pairs(context, doc_bytes=doc_bytes)
    combined_pairs = _combined_header_pairs(context, doc_bytes=doc_bytes)
    ville_pays_pairs = _ville_pays_pairs(context, doc_bytes=doc_bytes)
    welcome_ville_pays_pairs = _welcome_ville_pays_pairs(context, doc_bytes=doc_bytes)
    welcome_paragraph_pairs = _welcome_paragraph_pairs(context, doc_bytes=doc_bytes)
    pairs.extend(combined_pairs)
    pairs.extend(ville_pays_pairs)
    if not welcome_paragraph_pairs:
        pairs.extend(welcome_ville_pays_pairs)
    if not nom_expandable:
        pairs.extend(_nom_event_pairs(context, doc_bytes=doc_bytes))
    pairs.extend(welcome_paragraph_pairs)
    pairs.extend(_contact_section_pairs(context, doc_bytes=doc_bytes))
    pairs.extend(_teacher_line_pairs(context, doc_bytes=doc_bytes))
    pairs.extend(build_replacement_pairs(fields, context))

    combined_date_keys = {
        template.split(_COMBINED_HEADER_SPACING, 1)[0] for template, _ in combined_pairs
    }
    skip_placeholder_keys = (
        _COMBINED_HEADER_SKIP
        | combined_date_keys
        | frozenset(_ville_pays_templates())
        | frozenset(_welcome_ville_pays_templates())
        if combined_pairs or ville_pays_pairs or welcome_ville_pays_pairs
        else set()
    )

    from tip_common.french_placeholders import build_french_placeholder_pairs, is_french_brace_placeholder

    for old, new in build_french_placeholder_pairs(context):
        if old in skip_placeholder_keys:
            continue
        if nom_expandable and is_french_brace_placeholder(old) and "nom de" in old.lower():
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
    if email:
        for old_email in ("adresse@email", "xxxxx@email.com"):
            if len(email) <= len(old_email):
                extras.append((old_email, email))
    if phone:
        extras.extend(
            [
                (f"Téléphone: +11\xa0111\xa0111\xa0111 111", f"Téléphone: {phone}"),
                ("+11 111 111 111 111", phone),
                ("+xx xxx xxx xxx", phone),
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
        if any(old == wp for wp, _ in welcome_paragraph_pairs):
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if any(old.startswith(prefix) for prefix in _STATIC_PREFIXES):
            continue
        if any(old == combined for combined, _ in combined_pairs):
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if any(old == vp for vp, _ in ville_pays_pairs):
            if old not in {p[0] for p in safe}:
                safe.append((old, new, limits.get(old)))
            continue
        if any(old == wvp for wvp, _ in welcome_ville_pays_pairs):
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
    from app.services.docgen.doc_binary_replace import replace_fixed_width_in_binary

    result = doc_bytes
    expandable = _build_expandable_pairs(context, doc_bytes=doc_bytes)
    expanded = 0
    for old, new in expandable:
        new = _normalize_for_doc_text(new)
        if len(new) != len(old):
            continue
        result, count = replace_fixed_width_in_binary(
            result,
            old,
            new,
            encodings=("utf-16-le", "utf-8", "latin-1"),
        )
        expanded += count

    pairs = _build_safe_pairs(context, replacement_fields, doc_bytes=result)
    if not pairs and not expanded:
        return doc_bytes
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

    if replaced or expanded:
        logger.info("Programme .doc : %s remplacement(s) sûr(s)", replaced + expanded)
    return result if replaced or expanded else doc_bytes

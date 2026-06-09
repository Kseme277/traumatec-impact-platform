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

from tip_common.french_label_patterns import LEGACY_LIEUX as _LEGACY_LIEUX

_LEGACY_HOTEL_LIEUX = (
    "Nom de l'hôtel/l'hôpital, Bangui, RCA",
    "Nom de l'hôpital, Bangui, RCA",
)

# Textes fixes à ne jamais remplacer par le titre.
_STATIC_PREFIXES = (
    "Bienvenue",
    "Veuillez agréer",
    "But du cours",
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


def _legacy_template_pairs(context: dict[str, Any]) -> list[tuple[str, str]]:
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
    if title:
        for old in _LEGACY_SEMINAR_TITLES:
            if old != title:
                pairs.append((old, title))
    if lieu:
        for old in _LEGACY_LIEUX:
            if old != lieu:
                pairs.append((old, lieu))
        for old in _LEGACY_HOTEL_LIEUX:
            prefix = old.rsplit(",", 1)[0] + ","
            new_hotel = f"{prefix} {lieu}"
            if new_hotel != old:
                pairs.append((old, new_hotel))
    if date_val:
        for old in ("29 mai 2026", "24 octobre 2026", "25 – 27 novembre 2026"):
            if old != date_val:
                pairs.append((old, date_val))
    return pairs


def _build_safe_pairs(
    context: dict[str, Any],
    replacement_fields: list[dict[str, Any]] | None,
) -> list[tuple[str, str]]:
    from app.services.docgen.document_role_replace import _programme_fields_for_role
    from tip_common.template_field_analyzer import build_replacement_pairs

    fields = _programme_fields_for_role(replacement_fields)
    pairs = _legacy_template_pairs(context) + build_replacement_pairs(fields, context)

    title = (context.get("title_formatted") or context.get("title") or "").strip()
    from tip_common.location_fields import resolve_lieu_display

    lieu = resolve_lieu_display(context)
    email = (context.get("responsible_email") or "").strip()
    phone = (context.get("responsible_phone") or "").strip()

    extras: list[tuple[str, str]] = []
    if context.get("project_number"):
        extras.append(("TBD", str(context["project_number"])))
    if email:
        extras.append(("adresse@email", email))
    if phone:
        extras.append(("+11 111 111 111 111", phone))

    for old, new in extras:
        if new and old != new and (old, new) not in pairs:
            pairs.append((old, new))

    safe: list[tuple[str, str]] = []
    for old, new in sorted(pairs, key=lambda item: -len(item[0])):
        if not old or not new or old == new:
            continue
        if any(old.startswith(prefix) for prefix in _STATIC_PREFIXES):
            continue
        if old in _LEGACY_LIEUX or old in _LEGACY_SEMINAR_TITLES or old in _LEGACY_HOTEL_LIEUX:
            if old not in {p[0] for p in safe}:
                safe.append((old, new))
            continue
        if new == title and not any(marker in old for marker in _AO_MARKERS):
            continue
        if len(old) < 8 and new == title:
            continue
        if old in {p[0] for p in safe}:
            continue
        safe.append((old, new))

    return safe


def apply_programme_doc_replacements(
    doc_bytes: bytes,
    context: dict[str, Any],
    *,
    replacement_fields: list[dict[str, Any]] | None = None,
) -> bytes:
    pairs = _build_safe_pairs(context, replacement_fields)
    if not pairs:
        return doc_bytes

    result = doc_bytes
    replaced = 0
    for old, new in pairs:
        for encoding in ("utf-16-le", "utf-8", "latin-1"):
            try:
                old_b = old.encode(encoding)
                new_b = new.encode(encoding)
            except UnicodeEncodeError:
                continue
            if old_b not in result:
                continue
            count = 0
            while old_b in result:
                if len(new_b) <= len(old_b):
                    result = result.replace(old_b, new_b + b"\x00" * (len(old_b) - len(new_b)), 1)
                else:
                    result = result.replace(old_b, new_b, 1)
                count += 1
            if count:
                replaced += count
                break

    if replaced:
        logger.info("Programme .doc : %s remplacement(s) sûr(s)", replaced)
    return result

"""Remplacements sûrs pour les programmes AO en .doc (binaire OLE)."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_AO_MARKERS = ("AO Alliance", "AOA—", "AOA-", "Cours AOA", "Séminaire AO", "Séminaire AOA")

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


def _build_safe_pairs(
    context: dict[str, Any],
    replacement_fields: list[dict[str, Any]] | None,
) -> list[tuple[str, str]]:
    from app.services.docgen.document_role_replace import _programme_fields_for_role
    from tip_common.template_field_analyzer import build_replacement_pairs

    fields = _programme_fields_for_role(replacement_fields)
    pairs = build_replacement_pairs(fields, context)

    title = (context.get("title_formatted") or context.get("title") or "").strip()
    city = (context.get("city") or "").strip()
    country = (context.get("country") or "").strip()
    lieu = ", ".join(part for part in (city, country) if part)
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
            if len(new_b) <= len(old_b):
                result = result.replace(old_b, new_b + b"\x00" * (len(old_b) - len(new_b)), 1)
            else:
                result = result.replace(old_b, new_b, 1)
            replaced += 1
            break

    if replaced:
        logger.info("Programme .doc : %s remplacement(s) sûr(s)", replaced)
    return result

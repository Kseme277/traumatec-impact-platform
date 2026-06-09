"""Formatage IA des titres et libellés événement pour les paquets AO."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)


async def format_event_labels_with_ai(event: dict[str, Any]) -> dict[str, Any]:
    """
    Enrichit le contexte avec titres/dates/lieu formatés par NVIDIA.
    Retourne des clés supplémentaires : title_formatted, lieu_formatted, date_range_formatted.
    """
    key = (os.getenv("NVIDIA_API_KEY") or "").strip()
    if not key:
        return {}

    from tip_common.nvidia_client import nvidia_chat_completion
    payload_event = {
        "project_number": event.get("project_number"),
        "title": event.get("title"),
        "city": event.get("city"),
        "country": event.get("country"),
        "responsible_person": event.get("responsible_person"),
        "start_date": event.get("start_date"),
        "end_date": event.get("end_date"),
        "package_type": event.get("package_type"),
        "preparation_theme": event.get("preparation_theme"),
    }
    prompt = (
        "Tu formates les libellés d'un événement AO Alliance pour injection dans des modèles Word/Excel.\n"
        f"Données événement : {json.dumps(payload_event, ensure_ascii=False)}\n\n"
        "Produis des libellés en français, style officiel AO Alliance :\n"
        "- title_formatted : titre complet en français (Séminaire AO Alliance—…), SANS code projet, "
        "SANS underscores, SANS préfixe année (pas de 2026_…), tiret cadratin — entre segments\n"
        "- lieu_formatted : « Ville, Pays »\n"
        "- date_range_formatted : « JJ – JJ mois AAAA » ou « JJ mois AAAA » si 1 jour\n"
        "- date_single_formatted : « JJ mois AAAA »\n"
        "- header_lieu_date : « Ville, Pays JJ mois AAAA » ou avec plage de dates\n"
        "- responsible_formatted : nom du responsable tel quel\n\n"
        'JSON uniquement : {"title_formatted":"…","lieu_formatted":"…","date_range_formatted":"…",'
        '"date_single_formatted":"…","header_lieu_date":"…","responsible_formatted":"…"}'
    )

    content, error = await nvidia_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.15,
        max_tokens=800,
        timeout=45.0,
    )
    if not content:
        logger.warning("Formatage IA titres : %s", error)
        return {}

    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group())
    except json.JSONDecodeError:
        return {}

    out: dict[str, Any] = {}
    for k, v in parsed.items():
        if isinstance(v, str) and v.strip():
            out[k] = v.strip()
    return out

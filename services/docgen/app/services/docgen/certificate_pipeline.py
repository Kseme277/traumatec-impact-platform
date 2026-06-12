"""Génération des certificats participants (un .docx par personne, livrés en ZIP)."""

from __future__ import annotations

import json
import logging
import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

from app.services.docgen.event_context import enrich_event_context
from app.services.docgen.template_render import build_event_context, _format_date_long_fr
from tip_common.ai_title_formatter import format_event_labels_with_ai
from tip_common.participant_identity import dedupe_for_certificate_generation
from tip_common.title_formatter import format_document_title

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "templates" / "certificate_ao_page.docx"

# Textes du modèle Certifica1 (première page) — remplacés à chaque certificat.
_SAMPLE_NAME = "Fomena Fernandel"
_SAMPLE_DATE = "09 mai 2026"
_SAMPLE_CITY = "Yaoundé"
_SAMPLE_COUNTRY = "Cameroun"
_SAMPLE_EVENT = (
    "Séminaire AO Alliance      Information, Éducation et Communication (IEC) à l´Intention des "
    "Agents de Santé Communautaires: Épidémiologie, Incidence et Aspects de la Prise en Charge "
    "des Fractures au Cameroun"
)
_SAMPLE_EVENT_ALT = _SAMPLE_EVENT.replace("´", "'")

RoleFilter = Literal["all", "participant", "enseignant"]

_WT_NODE_RE = re.compile(r"(<w:t(?:\s[^>]*)?>)([^<]*)(</w:t>)")


def _role_footer_phrase(role: str) -> str:
    if role == "enseignant":
        return "l'enseignant"
    return "le participant"


def _parse_certificate_context_json(event: dict[str, Any]) -> dict[str, Any]:
    raw = event.get("certificate_context_json")
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _country_display(country: str) -> str:
    from tip_common.title_formatter import _country_to_fr

    text = (country or "").strip()
    if not text:
        return ""
    return _country_to_fr(text) if text else text


async def build_event_certificate_context(
    event: dict[str, Any],
    *,
    custom_title: str | None = None,
    refresh_ai: bool = False,
) -> dict[str, Any]:
    cert_ctx = _parse_certificate_context_json(event)
    source_title = (cert_ctx.get("source_event_title") or "").strip()
    persisted_title = (cert_ctx.get("title_formatted") or "").strip()

    if custom_title and custom_title.strip():
        title_formal = custom_title.strip()
    elif persisted_title and not refresh_ai:
        title_formal = persisted_title
    else:
        event_for_ai = dict(event)
        if source_title:
            event_for_ai["title"] = source_title
        enriched = await enrich_event_context(event_for_ai)
        ai_labels = await format_event_labels_with_ai(enriched)
        if ai_labels:
            enriched.update(ai_labels)
        ctx = build_event_context(enriched)
        title_formal = (
            ai_labels.get("title_formatted")
            or enriched.get("title_formatted")
            or format_document_title(enriched)
            or ctx.get("title_formatted")
            or source_title
            or ""
        )

    event_for_dates = dict(event)
    if source_title:
        event_for_dates["title"] = source_title
    enriched = await enrich_event_context(event_for_dates)
    ai_labels = await format_event_labels_with_ai(enriched) if refresh_ai else {}
    if ai_labels:
        enriched.update(ai_labels)
    ctx = build_event_context(enriched)

    start_raw = enriched.get("start_date") or event.get("start_date")
    end_raw = enriched.get("end_date") or event.get("end_date") or start_raw
    date_single = (
        enriched.get("date_single_formatted")
        or _format_date_long_fr(start_raw)
        or str(start_raw or "").strip()
    )
    if end_raw and end_raw != start_raw:
        range_fmt = enriched.get("date_range_formatted")
        if range_fmt:
            date_single = range_fmt

    city = (enriched.get("city") or ctx.get("city") or "").strip() or _SAMPLE_CITY
    country = _country_display(enriched.get("country") or ctx.get("country") or "") or _SAMPLE_COUNTRY

    lieu_formatted = (enriched.get("lieu_formatted") or ctx.get("lieu") or "").strip()
    if lieu_formatted and ", " in lieu_formatted and not enriched.get("city"):
        city_part, country_part = lieu_formatted.split(", ", 1)
        city = city_part.strip() or city
        country = country_part.strip() or country

    return {
        "title_formal": str(title_formal).strip(),
        "date_single": str(date_single).strip(),
        "city": city,
        "country": country,
    }


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _replace_text_nodes(xml: str, replacements: dict[str, str]) -> str:
    """Remplace le contenu des nœuds <w:t> (Word scinde souvent le texte en plusieurs runs)."""

    def _sub(match: re.Match[str]) -> str:
        open_tag, content, close_tag = match.group(1), match.group(2), match.group(3)
        if content in replacements:
            content = replacements[content]
        return f"{open_tag}{_xml_escape(content)}{close_tag}"

    return _WT_NODE_RE.sub(_sub, xml)


def _apply_replacements_to_docx_bytes(
    template_bytes: bytes,
    *,
    participant_name: str,
    event_title: str,
    role: str,
    date_single: str,
    city: str,
    country: str,
) -> bytes:
    role_footer = _role_footer_phrase(role)
    node_map = {
        _SAMPLE_NAME: participant_name,
        _SAMPLE_EVENT: event_title,
        _SAMPLE_EVENT_ALT: event_title,
        _SAMPLE_DATE: date_single,
        _SAMPLE_CITY: city,
        _SAMPLE_COUNTRY: country,
    }
    if role == "enseignant":
        # Word scinde « en tant que participant » en 3 nœuds : e + n tant qu + e participant
        node_map["e"] = ""
        node_map["n tant qu"] = "en tant qu'"
        node_map["e participant"] = "enseignant"

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    parts: dict[str, bytes] = {}
    with zipfile.ZipFile(BytesIO(template_bytes), "r") as zin:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                text = data.decode("utf-8")
                text = _replace_text_nodes(text, node_map)
                text = text.replace(
                    _xml_escape("le participant a assisté"),
                    _xml_escape(f"{role_footer} a assisté"),
                )
                text = text.replace(
                    _xml_escape("le participant a assisté à"),
                    _xml_escape(f"{role_footer} a assisté à"),
                )
                data = text.encode("utf-8")
            parts[item.filename] = data
    return repack_docx_archive(template_bytes, parts)


def _certificate_block_bounds(body: Any) -> tuple[int, int] | None:
    """Repère le bloc d'un certificat : paragraphe « Certificat » jusqu'au suivant (exclus)."""
    cert_indices = [
        idx
        for idx, child in enumerate(body)
        if "".join(child.itertext()).strip() == "Certificat"
    ]
    if len(cert_indices) < 2:
        return None
    return cert_indices[0], cert_indices[1]


def _paragraph_has_background_art(child: Any, w_tag: str) -> bool:
    """Logo / filigrane : ancres behindDoc, VML ou images dans le paragraphe."""
    from lxml import etree

    if child.find(f".//{w_tag}drawing") is not None:
        return True
    if child.find(f".//{w_tag}pict") is not None:
        return True
    vml_ns = "{urn:schemas-microsoft-com:vml}"
    if child.find(f".//{vml_ns}shape") is not None or child.find(f".//{vml_ns}imagedata") is not None:
        return True
    raw = etree.tostring(child)
    return b"behindDoc" in raw


def _is_background_only_paragraph(child: Any, w_tag: str) -> bool:
    """Filigrane / logo (codes numériques) — arrière-plan, pas de flux texte."""
    if not _paragraph_has_background_art(child, w_tag):
        return False
    text = "".join(child.itertext()).strip()
    if not text:
        return True
    digits = sum(ch.isdigit() for ch in text)
    return digits >= max(8, len(text) * 0.8)


def _strip_paragraph_section_breaks(child: Any, w_tag: str) -> None:
    """Supprime les sectPr inline — ils forcent une nouvelle section/page vide après chaque certificat."""
    ppr = child.find(f"{w_tag}pPr")
    if ppr is None:
        return
    for sect in ppr.findall(f"{w_tag}sectPr"):
        ppr.remove(sect)


def _certificate_body_children(body: Any, w_tag: str) -> list[Any]:
    """
    Reproduit la mise en page du modèle Certifica1 :
    calques logo/filigrane (p[24]/p[25]) en tête, puis contenu tel quel (p[3]…p[23]).
    Identique au préambule document p[1]/p[2] + bloc certificat dans le .docx source.
    """
    from copy import deepcopy

    bounds = _certificate_block_bounds(body)
    if bounds is None:
        return [deepcopy(child) for child in list(body) if child.tag != f"{w_tag}sectPr"]

    start, end = bounds
    backgrounds: list[Any] = []
    content: list[Any] = []

    for child in list(body)[start:end]:
        copied = deepcopy(child)
        _strip_paragraph_section_breaks(copied, w_tag)
        if _is_background_only_paragraph(copied, w_tag):
            backgrounds.append(copied)
        else:
            content.append(copied)

    return backgrounds + content


def _append_page_break_to_paragraph(paragraph: Any, w_tag: str) -> None:
    from lxml import etree

    run = paragraph.find(f"{w_tag}r")
    if run is None:
        run = etree.SubElement(paragraph, f"{w_tag}r")
    br = etree.SubElement(run, f"{w_tag}br")
    br.set(f"{w_tag}type", "page")


def _extract_first_certificate_template_bytes(full_template: bytes) -> bytes:
    """Extrait exactement un certificat (une page, sans saut de section parasite)."""
    from copy import deepcopy

    from lxml import etree

    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    w_tag = f"{{{ns}}}"

    with zipfile.ZipFile(BytesIO(full_template), "r") as zin:
        xml_bytes = zin.read("word/document.xml")

    root = etree.fromstring(xml_bytes)
    body = root.find(f".//{w_tag}body")
    if body is None:
        return full_template

    new_body = etree.Element(f"{w_tag}body")
    for child in _certificate_body_children(body, w_tag):
        new_body.append(child)

    sect = body.find(f"{w_tag}sectPr")
    if sect is not None:
        new_body.append(deepcopy(sect))

    parent = body.getparent()
    parent.remove(body)
    parent.append(new_body)

    single_xml = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    return repack_docx_archive(full_template, {"word/document.xml": single_xml})


def _merge_docx_documents(doc_bytes_list: list[bytes]) -> bytes:
    """Fusionne les certificats : un saut de page entre chaque bloc, une seule section document."""
    if not doc_bytes_list:
        raise ValueError("Aucun certificat à fusionner.")
    if len(doc_bytes_list) == 1:
        return doc_bytes_list[0]

    from copy import deepcopy

    from lxml import etree

    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    w_tag = f"{{{ns}}}"

    with zipfile.ZipFile(BytesIO(doc_bytes_list[0]), "r") as zin:
        template_zip = {item.filename: zin.read(item.filename) for item in zin.infolist()}

    master_root = etree.fromstring(template_zip["word/document.xml"])
    master_body = master_root.find(f".//{w_tag}body")
    if master_body is None:
        raise ValueError("document.xml invalide dans le premier certificat.")

    sect = master_body.find(f"{w_tag}sectPr")
    master_body.clear()
    if sect is not None:
        document_sect = deepcopy(sect)
    else:
        document_sect = None

    for index, doc_bytes in enumerate(doc_bytes_list):
        other_root = etree.fromstring(
            zipfile.ZipFile(BytesIO(doc_bytes), "r").read("word/document.xml")
        )
        other_body = other_root.find(f".//{w_tag}body")
        if other_body is None:
            continue
        children = [
            deepcopy(child)
            for child in list(other_body)
            if child.tag != f"{w_tag}sectPr"
        ]
        for child in children:
            _strip_paragraph_section_breaks(child, w_tag)

        if index > 0 and len(master_body) > 0:
            break_target = master_body[-1]
            for candidate in reversed(master_body):
                if not _is_background_only_paragraph(candidate, w_tag):
                    break_target = candidate
                    break
            _append_page_break_to_paragraph(break_target, w_tag)

        for child in children:
            master_body.append(child)

    if document_sect is not None:
        master_body.append(document_sect)

    template_zip["word/document.xml"] = etree.tostring(
        master_root, xml_declaration=True, encoding="UTF-8", standalone=True
    )

    out = BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in template_zip.items():
            zout.writestr(name, data)
    return out.getvalue()


def _participant_docx_filename(index: int, person: dict[str, Any]) -> str:
    name = str(person.get("full_name") or "participant").strip()
    safe = re.sub(r"[^A-Za-z0-9_\-]+", "_", name).strip("_")[:80] or "participant"
    return f"{index:03d}_{safe}.docx"


def _build_zip_filename(event: dict[str, Any], count: int, role_filter: RoleFilter) -> str:
    pn = re.sub(r"[^A-Za-z0-9_-]+", "_", str(event.get("project_number") or "event")).strip("_")
    suffix = "" if role_filter == "all" else f"_{role_filter}"
    return f"Certificats_{pn}{suffix}_{count}.zip"


async def generate_certificates_docx(
    *,
    event: dict[str, Any],
    participants: list[dict[str, Any]],
    role_filter: RoleFilter = "all",
) -> tuple[bytes, bytes, int, str, str]:
    """Génère un ZIP (un .docx par personne, une page) + le premier fichier pour l'aperçu."""
    if not TEMPLATE_PATH.is_file():
        raise FileNotFoundError(f"Modèle certificat introuvable : {TEMPLATE_PATH}")

    filtered = participants
    if role_filter == "participant":
        filtered = [p for p in participants if p.get("certificate_role") != "enseignant"]
    elif role_filter == "enseignant":
        filtered = [p for p in participants if p.get("certificate_role") == "enseignant"]

    if not filtered:
        raise ValueError("Aucun participant ne correspond au filtre sélectionné.")

    filtered, skipped_dupes = dedupe_for_certificate_generation(filtered)
    if skipped_dupes > 0:
        logger.info(
            "Certificats : %s doublon(s) ignoré(s) pour l'événement %s",
            skipped_dupes,
            event.get("project_number") or event.get("id"),
        )
    if not filtered:
        raise ValueError("Aucun participant unique après dédoublonnage.")

    full_template = TEMPLATE_PATH.read_bytes()
    single_template = _extract_first_certificate_template_bytes(full_template)
    cert_context = await build_event_certificate_context(event)

    rendered: list[tuple[dict[str, Any], bytes]] = []
    for person in filtered:
        name = str(person.get("full_name") or "").strip()
        role = str(person.get("certificate_role") or "participant")
        doc_bytes = _apply_replacements_to_docx_bytes(
            single_template,
            participant_name=name,
            event_title=cert_context["title_formal"],
            role=role,
            date_single=cert_context["date_single"],
            city=cert_context["city"],
            country=cert_context["country"],
        )
        rendered.append((person, doc_bytes))

    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for index, (person, doc_bytes) in enumerate(rendered, start=1):
            info = zipfile.ZipInfo(_participant_docx_filename(index, person))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.flag_bits |= 0x800
            archive.writestr(info, doc_bytes, compress_type=zipfile.ZIP_DEFLATED)

    zip_filename = _build_zip_filename(event, len(filtered), role_filter)
    preview_filename = _participant_docx_filename(1, rendered[0][0])
    return zip_buf.getvalue(), rendered[0][1], len(filtered), zip_filename, preview_filename

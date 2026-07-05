"""Détection rapide des placeholders {{ … }} dans les modèles — sans appel IA."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from pathlib import PurePosixPath
from typing import Any

from tip_common.variable_registry import is_keep_sample, resolve_brace_placeholder_to_key

_BRACE_PATTERN = re.compile(r"\{\{[^{}]+\}\}|\[[A-Z_]+\]")


def extract_brace_samples(filename: str, file_bytes: bytes) -> list[str]:
    """Retourne les placeholders {{ … }} / [TAG] uniques trouvés dans le fichier."""
    ext = PurePosixPath(filename).suffix.lower()
    if ext == ".docx":
        return _extract_from_docx(file_bytes)
    if ext in {".xlsx", ".xlsm"}:
        return _extract_from_xlsx(file_bytes)
    if ext == ".doc":
        return _extract_from_doc(file_bytes)
    return _extract_from_text(file_bytes)


def _extract_from_text(data: bytes) -> list[str]:
    found: set[str] = set()
    for encoding in ("utf-8", "latin-1"):
        try:
            text = data.decode(encoding, errors="ignore")
        except UnicodeDecodeError:
            continue
        found.update(_BRACE_PATTERN.findall(text))
    try:
        text = data.decode("utf-16-le", errors="ignore")
        found.update(_BRACE_PATTERN.findall(text))
    except UnicodeDecodeError:
        pass
    return sorted(found)


def _extract_from_docx(data: bytes) -> list[str]:
    found: set[str] = set()
    try:
        with zipfile.ZipFile(BytesIO(data)) as zf:
            for name in zf.namelist():
                if not (name.endswith(".xml") or name.endswith(".rels")):
                    continue
                if "word/" not in name and "xl/" not in name:
                    continue
                try:
                    raw = zf.read(name).decode("utf-8", errors="ignore")
                except KeyError:
                    continue
                found.update(_BRACE_PATTERN.findall(raw))
    except zipfile.BadZipFile:
        return _extract_from_text(data)
    return sorted(found)


def _extract_from_xlsx(data: bytes) -> list[str]:
    found: set[str] = set()
    try:
        with zipfile.ZipFile(BytesIO(data)) as zf:
            for name in zf.namelist():
                if not name.endswith(".xml"):
                    continue
                try:
                    raw = zf.read(name).decode("utf-8", errors="ignore")
                except KeyError:
                    continue
                found.update(_BRACE_PATTERN.findall(raw))
    except zipfile.BadZipFile:
        return _extract_from_text(data)
    return sorted(found)


def _extract_from_doc(data: bytes) -> list[str]:
    return _extract_from_text(data)


def scan_brace_placeholders(
    *,
    filename: str,
    file_bytes: bytes,
    document_role: str = "",
) -> dict[str, Any]:
    """Analyse instantanée : chaque {{ … }} est mappé au champ événement TIP."""
    samples = extract_brace_samples(filename, file_bytes)
    fields: list[dict[str, Any]] = []

    for sample in samples:
        key = resolve_brace_placeholder_to_key(sample)
        if key:
            fields.append(
                {
                    "sample": sample,
                    "context_key": key,
                    "strategy": "replace",
                    "section_kind": "placeholder",
                    "highlighted": False,
                    "location": "brace",
                    "classifier": "brace",
                }
            )
            continue
        if is_keep_sample(sample):
            fields.append(
                {
                    "sample": sample,
                    "context_key": "",
                    "strategy": "keep",
                    "section_kind": "placeholder",
                    "highlighted": False,
                    "location": "brace",
                    "classifier": "brace",
                }
            )

    return {
        "filename": filename,
        "document_role": document_role,
        "classifier": "brace",
        "section_count": len(samples),
        "replaceable_count": len([f for f in fields if f.get("strategy") != "keep"]),
        "replacement_fields": fields,
    }

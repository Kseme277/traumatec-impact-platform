"""Reconditionnement ZIP des .docx en préservant les métadonnées (compatibilité Word Windows)."""

from __future__ import annotations

import zipfile
from io import BytesIO


def repack_docx_archive(source: bytes, parts: dict[str, bytes] | None = None) -> bytes:
    """Réécrit l'archive OOXML en conservant compress_type et attributs de chaque entrée."""
    parts = parts or {}
    out = BytesIO()
    with zipfile.ZipFile(BytesIO(source), "r") as zin:
        with zipfile.ZipFile(out, "w") as zout:
            for info in zin.infolist():
                data = parts.get(info.filename, zin.read(info.filename))
                zout.writestr(info, data, compress_type=info.compress_type)
    return out.getvalue()

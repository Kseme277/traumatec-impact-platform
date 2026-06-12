"""Insertion / remplacement de la photo du responsable national dans les programmes Word."""

from __future__ import annotations

import logging
import zipfile
from io import BytesIO
from typing import Any

logger = logging.getLogger(__name__)

_IMAGE_EXTS = {
    b"\xff\xd8\xff": ".jpeg",
    b"\x89PNG\r\n\x1a\n": ".png",
    b"GIF87a": ".gif",
    b"GIF89a": ".gif",
}


def _guess_image_ext(data: bytes) -> str:
    for magic, ext in _IMAGE_EXTS.items():
        if data.startswith(magic):
            return ext
    return ".jpeg"


def apply_responsible_photo_docx(
    data: bytes,
    photo_bytes: bytes | None,
    *,
    document_role: str | None = None,
) -> bytes:
    """
    Remplace la 2e image embarquée (1re = logo AO) par la photo du responsable si fournie.
    """
    if not photo_bytes or document_role != "programme":
        return data

    try:
        with zipfile.ZipFile(BytesIO(data), "r") as zin:
            parts = {name: zin.read(name) for name in zin.namelist()}
    except zipfile.BadZipFile:
        return data

    media = sorted(
        name
        for name in parts
        if name.startswith("word/media/") and not name.endswith("/")
    )
    if not media:
        return data

    # Logo en image1 — photo responsable en image2 (convention paquets AO).
    target = media[1] if len(media) >= 2 else media[0]
    ext = _guess_image_ext(photo_bytes)
    new_name = target
    if not target.lower().endswith(ext):
        base = target.rsplit(".", 1)[0]
        new_name = f"{base}{ext}"
        if new_name != target:
            parts[new_name] = photo_bytes
            del parts[target]
            # Mettre à jour les références dans les XML (nom simple)
            for key, content in list(parts.items()):
                if key.endswith(".xml") and target.encode() in content:
                    parts[key] = content.replace(target.encode(), new_name.encode())
        else:
            parts[target] = photo_bytes
    else:
        parts[target] = photo_bytes

    from app.services.docgen.docx_zip_repack import repack_docx_archive

    logger.info("Programme : photo responsable insérée (%s)", new_name)
    return repack_docx_archive(data, parts)

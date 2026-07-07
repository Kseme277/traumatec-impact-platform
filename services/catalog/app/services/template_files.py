"""Téléchargement et remplacement de fichiers template (paquets versionnés)."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.catalog import PackageTemplate
from tip_common.storage import get_object_storage
from tip_common.upload_validation import (
    read_validated_document,
)

ALLOWED_SUFFIXES = {".docx", ".doc", ".odt"}


def _content_type(path: Path) -> str:
    if path.suffix.lower() == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if path.suffix.lower() == ".odt":
        return "application/vnd.oasis.opendocument.text"
    return "application/msword"


async def get_template_or_404(db: AsyncSession, template_id: UUID) -> PackageTemplate:
    template = await db.get(PackageTemplate, template_id)
    if template is None or not template.is_active:
        raise ValueError("Template introuvable")
    return template


async def download_template_bytes(settings: Settings, template: PackageTemplate) -> tuple[bytes, str, str]:
    storage = get_object_storage(settings)
    data = storage.download_bytes(template.file_path)
    meta = template.placeholders or {}
    filename = meta.get("source_file") or f"{template.code}{Path(template.file_path).suffix}"
    return data, filename, _content_type(Path(filename))


async def replace_template_file(
    db: AsyncSession,
    settings: Settings,
    *,
    template_id: UUID,
    file: UploadFile,
) -> PackageTemplate:
    template = await get_template_or_404(db, template_id)
    data, raw_name = await read_validated_document(file, allowed_suffixes=ALLOWED_SUFFIXES)
    path = Path(raw_name)
    ext = path.suffix.lower()
    storage = get_object_storage(settings)
    storage.upload_bytes(template.file_path, data, content_type=_content_type(path))

    meta = dict(template.placeholders or {})
    meta["source_file"] = raw_name
    meta["file_format"] = ext.lstrip(".")
    template.placeholders = meta
    template.version += 1
    await db.commit()
    await db.refresh(template)
    return template


async def replace_template_bytes(
    db: AsyncSession,
    settings: Settings,
    template: PackageTemplate,
    data: bytes,
    *,
    ext: str,
    content_type: str,
) -> PackageTemplate:
    """Remplace le fichier stocké (callback ONLYOFFICE)."""
    if not data:
        raise ValueError("Fichier vide")

    storage = get_object_storage(settings)
    storage.upload_bytes(template.file_path, data, content_type=content_type)

    meta = dict(template.placeholders or {})
    meta["file_format"] = ext.lstrip(".")
    meta["source_file"] = meta.get("source_file") or f"{template.code}{ext}"
    template.placeholders = meta
    template.version += 1
    await db.commit()
    await db.refresh(template)
    return template

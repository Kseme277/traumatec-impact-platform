"""Intégration ONLYOFFICE Document Server pour Word et Excel."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from pathlib import Path
from uuid import UUID

import httpx

from app.core.config import Settings
from app.models.catalog import PackageTemplate
from app.services.template_files import download_template_bytes, replace_template_bytes

logger = logging.getLogger(__name__)

# Status 2 = save on close/autosave; status 6 = forcesave.
ONLYOFFICE_SAVE_READY_STATUSES = frozenset({2, 6})

WORD_EXTENSIONS = {".doc", ".docx", ".odt", ".rtf", ".txt", ".docm", ".dotx", ".dot"}
SPREADSHEET_EXTENSIONS = {".xlsx", ".xls", ".ods", ".csv"}
SUPPORTED_EXTENSIONS = WORD_EXTENSIONS | SPREADSHEET_EXTENSIONS

CONTENT_TYPES: dict[str, str] = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".csv": "text/csv",
}


def template_extension(template: PackageTemplate) -> str:
    ext = Path(template.file_path).suffix.lower()
    return ext.lstrip(".") or "docx"


def is_onlyoffice_supported(template: PackageTemplate) -> bool:
    return Path(template.file_path).suffix.lower() in SUPPORTED_EXTENSIONS


def _document_type_for_extension(ext: str) -> str:
    suffix = f".{ext.lower().lstrip('.')}"
    if suffix in SPREADSHEET_EXTENSIONS:
        return "cell"
    return "word"


def _sign(secret: str, template_id: UUID, purpose: str, expires: int) -> str:
    payload = f"{template_id}:{purpose}:{expires}"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_access_token(settings: Settings, template_id: UUID, purpose: str) -> str:
    expires = int(time.time()) + settings.onlyoffice_token_ttl_seconds
    signature = _sign(settings.onlyoffice_file_secret, template_id, purpose, expires)
    return f"{expires}.{signature}"


def verify_access_token(
    settings: Settings, template_id: UUID, purpose: str, token: str | None
) -> bool:
    if not token or "." not in token:
        return False
    expires_str, signature = token.split(".", 1)
    try:
        expires = int(expires_str)
    except ValueError:
        return False
    if expires < int(time.time()):
        return False
    expected = _sign(settings.onlyoffice_file_secret, template_id, purpose, expires)
    return hmac.compare_digest(expected, signature)


def document_key(template: PackageTemplate) -> str:
    return f"{template.id}_{template.version}"


def build_editor_config(
    settings: Settings,
    template: PackageTemplate,
    *,
    mode: str,
    user_id: str,
    user_name: str,
) -> dict:
    if not is_onlyoffice_supported(template):
        raise ValueError("Format non pris en charge par ONLYOFFICE.")

    file_token = create_access_token(settings, template.id, "file")
    callback_token = create_access_token(settings, template.id, "callback")
    ext = template_extension(template)
    filename = f"{template.code}.{ext}"
    base = settings.catalog_internal_url.rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")

    file_url = (
        f"{base}{prefix}/templates/{template.id}/onlyoffice-file"
        f"?token={file_token}"
    )
    callback_url = (
        f"{base}{prefix}/templates/{template.id}/onlyoffice-callback"
        f"?token={callback_token}"
    )

    return {
        "documentServerUrl": settings.onlyoffice_public_url.rstrip("/"),
        "config": {
            "document": {
                "fileType": ext,
                "key": document_key(template),
                "title": filename,
                "url": file_url,
            },
            "documentType": _document_type_for_extension(ext),
            "editorConfig": {
                "mode": "edit" if mode == "edit" else "view",
                "lang": "fr",
                "callbackUrl": callback_url,
                "user": {"id": user_id, "name": user_name},
                "customization": {
                    "forcesave": True,
                    "compactToolbar": False,
                },
            },
            "height": "100%",
            "width": "100%",
        },
    }


async def handle_onlyoffice_callback(
    db,
    settings: Settings,
    template: PackageTemplate,
    body: dict,
) -> dict:
    """Traite le callback ONLYOFFICE (status 2 = document prêt à enregistrer)."""
    status_code = body.get("status")
    if status_code in (1, 4):
        return {"error": 0}
    if status_code == 7:
        logger.warning("ONLYOFFICE forcesave échoué template=%s", template.id)
        return {"error": 1}
    if status_code not in ONLYOFFICE_SAVE_READY_STATUSES:
        logger.info("ONLYOFFICE callback ignoré status=%s template=%s", status_code, template.id)
        return {"error": 0}

    download_url = body.get("url")
    if not isinstance(download_url, str) or not download_url.strip():
        logger.warning("ONLYOFFICE callback sans URL template=%s", template.id)
        return {"error": 1}

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(download_url)
        response.raise_for_status()
        data = response.content

    ext = Path(template.file_path).suffix.lower() or ".docx"
    content_type = CONTENT_TYPES.get(
        ext,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    await replace_template_bytes(db, settings, template, data, ext=ext, content_type=content_type)
    return {"error": 0}


async def onlyoffice_file_response(settings: Settings, template: PackageTemplate) -> tuple[bytes, str, str]:
    return await download_template_bytes(settings, template)

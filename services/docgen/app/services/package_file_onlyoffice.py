"""ONLYOFFICE — aperçu et édition des fichiers d'un paquet documentaire."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from pathlib import Path
from urllib.parse import quote
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.services.package_file_storage import file_revision, replace_package_file_bytes
from app.services.package_file_utils import CONTENT_TYPES, content_type_for_filename, resolve_package_file
from tip_common.storage import get_object_storage

logger = logging.getLogger(__name__)

# Status 2 = save on close/autosave; status 6 = forcesave (bouton Enregistrer).
ONLYOFFICE_SAVE_READY_STATUSES = frozenset({2, 6})

DOCX_FALLBACK = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX_FALLBACK = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _sign(secret: str, job_id: UUID, template_code: str, purpose: str, expires: int) -> str:
    payload = f"{job_id}:{template_code}:{purpose}:{expires}"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_access_token(settings: Settings, job_id: UUID, template_code: str, purpose: str) -> str:
    expires = int(time.time()) + settings.onlyoffice_token_ttl_seconds
    signature = _sign(settings.onlyoffice_file_secret, job_id, template_code, purpose, expires)
    return f"{expires}.{signature}"


def verify_access_token(
    settings: Settings, job_id: UUID, template_code: str, purpose: str, token: str | None
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
    expected = _sign(settings.onlyoffice_file_secret, job_id, template_code, purpose, expires)
    return hmac.compare_digest(expected, signature)


def onlyoffice_document_meta(filename: str) -> tuple[str, str, str] | None:
    ext = Path(filename).suffix.lower()
    if ext in {".docx", ".doc"}:
        return ext.lstrip("."), "word", CONTENT_TYPES.get(ext, DOCX_FALLBACK)
    if ext in {".xlsx", ".xls"}:
        return ext.lstrip("."), "cell", CONTENT_TYPES.get(ext, XLSX_FALLBACK)
    if ext == ".pptx":
        return "pptx", "slide", CONTENT_TYPES[ext]
    if ext == ".pdf":
        return "pdf", "word", CONTENT_TYPES[ext]
    return None


def document_key(job_id: UUID, template_code: str, revision: int = 0) -> str:
    code_hash = hashlib.sha256(template_code.encode()).hexdigest()[:12]
    return f"pkg_{job_id}_{code_hash}_{revision}"


def build_package_file_editor_config(
    settings: Settings,
    *,
    job_id: UUID,
    template_code: str,
    filename: str,
    user_id: str,
    user_name: str,
    mode: str = "view",
    trace: dict | None = None,
) -> dict:
    meta = onlyoffice_document_meta(filename)
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce type de fichier ne peut pas être ouvert dans ONLYOFFICE",
        )
    file_type, document_type, _ = meta
    file_token = create_access_token(settings, job_id, template_code, "file")
    base = settings.docgen_internal_url.rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")
    encoded = quote(template_code, safe="")
    file_url = (
        f"{base}{prefix}/generations/{job_id}/files/{encoded}/onlyoffice-file"
        f"?token={file_token}"
    )

    revision = file_revision(trace, template_code)
    editor_mode = "edit" if mode == "edit" else "view"
    editor_config: dict = {
        "mode": editor_mode,
        "lang": "fr",
        "user": {"id": user_id, "name": user_name},
        "customization": {
            "forcesave": mode == "edit",
            "autosave": False,
            "compactToolbar": mode != "edit",
        },
    }

    if mode == "edit":
        callback_token = create_access_token(settings, job_id, template_code, "callback")
        editor_config["callbackUrl"] = (
            f"{base}{prefix}/generations/{job_id}/files/{encoded}/onlyoffice-callback"
            f"?token={callback_token}"
        )

    return {
        "document_server_url": settings.onlyoffice_public_url.rstrip("/"),
        "config": {
            "document": {
                "fileType": file_type,
                "key": document_key(job_id, template_code, revision),
                "title": filename,
                "url": file_url,
            },
            "documentType": document_type,
            "editorConfig": editor_config,
            "height": "100%",
            "width": "100%",
        },
    }


def download_package_file_bytes(settings: Settings, storage_key: str) -> bytes:
    storage = get_object_storage(settings)
    return storage.download_bytes(storage_key)


def _normalize_onlyoffice_download_url(settings: Settings, url: str) -> str:
    """Réécrit une URL publique ONLYOFFICE vers le service Docker interne."""
    internal = settings.onlyoffice_internal_url.rstrip("/")
    public = settings.onlyoffice_public_url.rstrip("/")
    if url.startswith(public):
        path = url[len(public) :]
        if path.startswith("/onlyoffice"):
            path = path[len("/onlyoffice") :]
        return f"{internal}{path}"
    marker = "/onlyoffice/"
    idx = url.find(marker)
    if idx >= 0:
        return f"{internal}/{url[idx + len(marker) :]}"
    return url


async def trigger_onlyoffice_forcesave(settings: Settings, document_key: str) -> dict:
    """Demande un enregistrement forcé via le command service ONLYOFFICE."""
    base = settings.onlyoffice_internal_url.rstrip("/")
    command_url = f"{base}/coauthoring/CommandService.ashx"
    payload = {"c": "forcesave", "key": document_key}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(command_url, json=payload)
        response.raise_for_status()
        data = response.json()
    if not isinstance(data, dict):
        raise ValueError("Réponse ONLYOFFICE command service invalide")
    logger.info("ONLYOFFICE forcesave key=%s result=%s", document_key, data)
    return data


async def handle_package_file_callback(
    db: AsyncSession,
    settings: Settings,
    job: dict,
    template_code: str,
    body: dict,
) -> dict:
    status_code = body.get("status")
    logger.info(
        "ONLYOFFICE callback status=%s job=%s file=%s",
        status_code,
        job.get("id"),
        template_code,
    )
    if status_code in (1, 4):
        return {"error": 0}
    if status_code == 7:
        logger.warning(
            "ONLYOFFICE forcesave échoué job=%s file=%s",
            job.get("id"),
            template_code,
        )
        return {"error": 1}
    if status_code not in ONLYOFFICE_SAVE_READY_STATUSES:
        logger.info(
            "ONLYOFFICE callback ignoré status=%s job=%s file=%s",
            status_code,
            job.get("id"),
            template_code,
        )
        return {"error": 0}

    download_url = body.get("url")
    if not isinstance(download_url, str) or not download_url.strip():
        logger.warning("ONLYOFFICE callback sans URL job=%s file=%s", job.get("id"), template_code)
        return {"error": 1}

    download_url = _normalize_onlyoffice_download_url(settings, download_url.strip())

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(download_url)
        response.raise_for_status()
        data = response.content

    await replace_package_file_bytes(db, settings, job, template_code, data, rebuild_zip=True)
    logger.info(
        "ONLYOFFICE fichier enregistré job=%s file=%s bytes=%s",
        job.get("id"),
        template_code,
        len(data),
    )
    return {"error": 0}

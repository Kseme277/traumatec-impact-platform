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
from app.services.package_workflow import trace_package_files
from tip_common.storage import get_object_storage

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
}

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


def resolve_package_file(job: dict, template_code: str) -> tuple[str, str]:
    trace = job.get("template_versions_json") or {}
    prefix = ""
    if isinstance(trace, dict):
        prefix = trace.get("dossier_prefix") or ""
    for item in trace_package_files(trace):
        if item.get("template_code") == template_code:
            arcname = item.get("file_path") or template_code
            return f"{prefix}{arcname}", arcname
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable dans le paquet")


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


def content_type_for_filename(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return CONTENT_TYPES.get(ext, "application/octet-stream")


async def handle_package_file_callback(
    db: AsyncSession,
    settings: Settings,
    job: dict,
    template_code: str,
    body: dict,
) -> dict:
    status_code = body.get("status")
    if status_code in (1, 4):
        return {"error": 0}
    if status_code != 2:
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

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        response = await client.get(download_url)
        response.raise_for_status()
        data = response.content

    await replace_package_file_bytes(db, settings, job, template_code, data)
    return {"error": 0}

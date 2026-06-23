"""ONLYOFFICE — aperçu des fichiers d'un paquet documentaire (lecture seule)."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import Settings
from tip_common.storage import get_object_storage

CONTENT_TYPES = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
}


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


DOCX_FALLBACK = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX_FALLBACK = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def document_key(job_id: UUID, template_code: str) -> str:
    code_hash = hashlib.sha256(template_code.encode()).hexdigest()[:12]
    return f"pkg_{job_id}_{code_hash}"


def build_package_file_editor_config(
    settings: Settings,
    *,
    job_id: UUID,
    template_code: str,
    filename: str,
    user_id: str,
    user_name: str,
) -> dict:
    meta = onlyoffice_document_meta(filename)
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce type de fichier ne peut pas être prévisualisé dans ONLYOFFICE",
        )
    file_type, document_type, _ = meta
    file_token = create_access_token(settings, job_id, template_code, "file")
    base = settings.docgen_internal_url.rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")
    encoded = template_code.replace("/", "%2F")
    file_url = (
        f"{base}{prefix}/generations/{job_id}/files/{encoded}/onlyoffice-file"
        f"?token={file_token}"
    )
    return {
        "document_server_url": settings.onlyoffice_public_url.rstrip("/"),
        "config": {
            "document": {
                "fileType": file_type,
                "key": document_key(job_id, template_code),
                "title": filename,
                "url": file_url,
            },
            "documentType": document_type,
            "editorConfig": {
                "mode": "view",
                "lang": "fr",
                "user": {"id": user_id, "name": user_name},
                "customization": {"compactToolbar": True},
            },
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

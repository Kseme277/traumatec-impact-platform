"""ONLYOFFICE — aperçu des certificats générés (mode lecture seule)."""

from __future__ import annotations

import hashlib
import hmac
import time
from datetime import datetime
from uuid import UUID

from app.core.config import Settings
from tip_common.storage import get_object_storage

DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _sign(secret: str, generation_id: UUID, purpose: str, expires: int) -> str:
    payload = f"{generation_id}:{purpose}:{expires}"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_access_token(settings: Settings, generation_id: UUID, purpose: str) -> str:
    expires = int(time.time()) + settings.onlyoffice_token_ttl_seconds
    signature = _sign(settings.onlyoffice_file_secret, generation_id, purpose, expires)
    return f"{expires}.{signature}"


def verify_access_token(
    settings: Settings, generation_id: UUID, purpose: str, token: str | None
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
    expected = _sign(settings.onlyoffice_file_secret, generation_id, purpose, expires)
    return hmac.compare_digest(expected, signature)


def document_key(generation_id: UUID, created_at: datetime) -> str:
    stamp = int(created_at.timestamp())
    return f"cert_{generation_id}_{stamp}"


def build_certificate_editor_config(
    settings: Settings,
    *,
    generation_id: UUID,
    filename: str,
    created_at: datetime,
    user_id: str,
    user_name: str,
) -> dict:
    file_token = create_access_token(settings, generation_id, "file")
    base = settings.docgen_internal_url.rstrip("/")
    prefix = settings.api_v1_prefix.rstrip("/")
    file_url = (
        f"{base}{prefix}/certificates/generations/{generation_id}/onlyoffice-file"
        f"?token={file_token}"
    )

    return {
        "document_server_url": settings.onlyoffice_public_url.rstrip("/"),
        "config": {
            "document": {
                "fileType": "docx",
                "key": document_key(generation_id, created_at),
                "title": filename,
                "url": file_url,
            },
            "documentType": "word",
            "editorConfig": {
                "mode": "view",
                "lang": "fr",
                "user": {"id": user_id, "name": user_name},
                "customization": {
                    "compactToolbar": True,
                },
            },
            "height": "100%",
            "width": "100%",
        },
    }


def download_certificate_bytes(settings: Settings, storage_key: str) -> bytes:
    storage = get_object_storage(settings)
    return storage.download_bytes(storage_key)

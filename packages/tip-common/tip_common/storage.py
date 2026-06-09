"""Stockage objet MinIO (S3-compatible) pour documents TIP."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import TYPE_CHECKING

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from tip_common.config import BaseServiceSettings

logger = logging.getLogger(__name__)

TEMPLATES_PREFIX = "templates/"
PACKAGES_BUNDLES_PREFIX = "templates/packages/bundles/"
GENERATIONS_PREFIX = "generations/"
GENERATIONS_EVENT_PREFIX = "generations/events/"
UPLOADS_PREFIX = "uploads/"
AUDIT_EXPORTS_PREFIX = "audit/exports/"


class ObjectStorage:
    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1",
        secure: bool = False,
    ):
        self.bucket = bucket
        scheme = "https" if secure else "http"
        host = endpoint.removeprefix("http://").removeprefix("https://")
        self.endpoint_url = f"{scheme}://{host}"
        self.client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
            logger.info("Bucket MinIO prêt : %s", self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)
            logger.info("Bucket MinIO créé : %s", self.bucket)

    def upload_bytes(self, key: str, data: bytes, *, content_type: str = "application/octet-stream") -> str:
        self.client.upload_fileobj(
            BytesIO(data),
            self.bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return key

    def download_bytes(self, key: str) -> bytes:
        buffer = BytesIO()
        self.client.download_fileobj(self.bucket, key, buffer)
        return buffer.getvalue()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def list_keys(self, prefix: str) -> list[str]:
        response = self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        return [item["Key"] for item in response.get("Contents", []) if item.get("Key")]


def get_object_storage(settings: BaseServiceSettings) -> ObjectStorage:
    return ObjectStorage(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
        region=settings.minio_region,
        secure=settings.minio_secure,
    )


def ensure_document_storage(settings: BaseServiceSettings) -> None:
    """Initialise le stockage documents (MinIO ou dossiers locaux)."""
    if settings.storage_backend.lower() == "minio":
        if not settings.minio_access_key or not settings.minio_secret_key:
            logger.warning("MinIO non configuré — MINIO_ACCESS_KEY / MINIO_SECRET_KEY manquants")
            return
        get_object_storage(settings).ensure_bucket()
        return

    settings.storage_root.mkdir(parents=True, exist_ok=True)
    for prefix in (TEMPLATES_PREFIX, GENERATIONS_PREFIX, UPLOADS_PREFIX):
        (settings.storage_root / prefix.rstrip("/")).mkdir(parents=True, exist_ok=True)

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    service_name: str = "tip-service"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "postgresql+asyncpg://tip:tip@localhost:5432/tip"
    db_schema: str = "public"

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    firebase_project_id: str = ""
    firebase_credentials_path: str | None = None

    storage_root: Path = Path("/app/storage")

    # Stockage documents — MinIO (S3) ou local
    storage_backend: str = "minio"
    minio_endpoint: str = "http://minio:9000"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "tip-documents"
    minio_region: str = "us-east-1"
    minio_secure: bool = False

    # URLs inter-services (grimage futur de modules)
    identity_service_url: str = "http://identity:8001"
    events_service_url: str = "http://events:8002"
    catalog_service_url: str = "http://catalog:8003"
    docgen_service_url: str = "http://docgen:8004"


@lru_cache
def get_base_settings() -> BaseServiceSettings:
    return BaseServiceSettings()

from functools import lru_cache
from pathlib import Path

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "catalog"
    port: int = 8003
    db_schema: str = "catalog"

    onlyoffice_public_url: str = "http://localhost:9980"
    catalog_internal_url: str = "http://catalog:8003"
    onlyoffice_file_secret: str = "change-me-onlyoffice-file-secret"
    onlyoffice_token_ttl_seconds: int = 7200


@lru_cache
def get_settings() -> Settings:
    return Settings()

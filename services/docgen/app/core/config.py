from functools import lru_cache
from pathlib import Path

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "docgen"
    port: int = 8004
    db_schema: str = "docgen"
    rq_queue_name: str = "docgen"
    templates_dir: Path = Path("/app/storage/templates")
    generations_dir: Path = Path("/app/storage/generations")
    uploads_dir: Path = Path("/app/storage/uploads")
    zip_name_pattern: str = "{project_number}_{event_name}_{city}_{country}_{date}"
    docgen_internal_url: str = "http://docgen:8004"
    app_public_url: str = "http://localhost:5173"
    onlyoffice_public_url: str = "http://localhost:9980"
    onlyoffice_file_secret: str = "change-me-onlyoffice-file-secret"
    onlyoffice_token_ttl_seconds: int = 7200


@lru_cache
def get_settings() -> Settings:
    return Settings()

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


@lru_cache
def get_settings() -> Settings:
    return Settings()

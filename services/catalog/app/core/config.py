from functools import lru_cache

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "catalog"
    port: int = 8003
    db_schema: str = "catalog"
    templates_dir: str = "/app/storage/templates"


@lru_cache
def get_settings() -> Settings:
    return Settings()

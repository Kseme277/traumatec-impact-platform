from functools import lru_cache

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "events"
    port: int = 8002
    db_schema: str = "events"


@lru_cache
def get_settings() -> Settings:
    return Settings()

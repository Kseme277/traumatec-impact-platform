from functools import lru_cache

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "module-name"
    port: int = 8005
    db_schema: str = "module_name"


@lru_cache
def get_settings() -> Settings:
    return Settings()

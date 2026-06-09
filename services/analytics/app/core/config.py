from functools import lru_cache

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "analytics"
    models_dir: str = "/app/app/ml/artifacts"


@lru_cache
def get_settings() -> Settings:
    return Settings()

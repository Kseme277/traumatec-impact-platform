from functools import lru_cache

from tip_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "identity"
    port: int = 8001
    db_schema: str = "identity"
    api_v1_prefix: str = "/api"

    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_webhook_secret: str = ""

    app_public_url: str = "http://localhost:5173"
    app_name: str = "Traumatec Impact Platform"

    smtp_enabled: bool = True
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_use_tls: bool = False
    smtp_from_email: str = "noreply@traumatec.org"
    smtp_from_name: str = "Traumatec Impact Platform"

    # Admin par défaut — créé au démarrage si absent en base
    bootstrap_admin_email: str = ""
    bootstrap_admin_nom: str = ""
    bootstrap_admin_prenom: str = ""
    bootstrap_admin_clerk_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

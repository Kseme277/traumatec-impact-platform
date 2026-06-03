from app.api.v1 import certificate_sets, profiles, templates
from app.core.config import get_settings
from tip_common.app_factory import create_service_app
from tip_common.storage import ensure_document_storage

settings = get_settings()


def ensure_storage() -> None:
    ensure_document_storage(settings)


app = create_service_app(
    settings=settings,
    routers=[
        (templates.router, "/templates", ["templates"]),
        (certificate_sets.router, "/certificate-sets", ["certificate-sets"]),
        (profiles.router, "/profiles", ["profiles"]),
    ],
    on_startup=ensure_storage,
)

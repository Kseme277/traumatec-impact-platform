from app.api.v1 import certificate_sets, packages, parcours, profiles, templates
from app.core.config import get_settings
from app.services.db_migrate import ensure_catalog_schema
from app.services.startup_bootstrap import bootstrap_packages_on_startup
from tip_common.app_factory import create_service_app
from tip_common.storage import ensure_document_storage

settings = get_settings()


async def on_catalog_startup() -> None:
    ensure_document_storage(settings)
    await ensure_catalog_schema()
    await bootstrap_packages_on_startup()


app = create_service_app(
    settings=settings,
    routers=[
        (templates.router, "/templates", ["templates"]),
        (certificate_sets.router, "/certificate-sets", ["certificate-sets"]),
        (profiles.router, "/profiles", ["profiles"]),
        (packages.router, "/packages", ["packages"]),
        (parcours.router, "/parcours", ["parcours"]),
    ],
    on_startup=on_catalog_startup,
)

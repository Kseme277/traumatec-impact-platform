from app.api.v1 import generations
from app.core.config import get_settings
from tip_common.app_factory import create_service_app
from tip_common.storage import ensure_document_storage

settings = get_settings()


def ensure_storage() -> None:
    ensure_document_storage(settings)


app = create_service_app(
    settings=settings,
    routers=[
        (generations.router, "/generations", ["generations"]),
    ],
    on_startup=ensure_storage,
)

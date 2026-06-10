from app.api.v1 import events, imports, participants
from app.core.config import get_settings
from app.services.db_migrate import apply_pending_migrations
from tip_common.app_factory import create_service_app
from tip_common.storage import ensure_document_storage

settings = get_settings()


async def on_startup() -> None:
    ensure_document_storage(settings)
    await apply_pending_migrations()


app = create_service_app(
    settings=settings,
    routers=[
        (events.router, "/events", ["events"]),
        (imports.router, "/imports", ["imports"]),
        (participants.router, "/participants", ["participants"]),
    ],
    on_startup=on_startup,
)

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.admin import users as admin_users
from app.api.users import profile as users_profile
from app.api.v1 import audit as audit_v1
from app.api.v1 import guides as guides_v1
from app.api.webhooks import clerk as clerk_webhooks
from app.core.config import get_settings
from app.services.audit_scheduler import audit_export_loop
from app.services.bootstrap import bootstrap_default_admin
from tip_common.storage import ensure_document_storage

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_document_storage(settings)
    await bootstrap_default_admin()
    scheduler_task = asyncio.create_task(audit_export_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="TIP — Identity Service",
    version=settings.app_version,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_users.router, prefix="/api/admin/users", tags=["admin-users"])
app.include_router(users_profile.router, prefix="/api/users", tags=["users"])
app.include_router(audit_v1.router, prefix="/api/v1/audit", tags=["audit"])
app.include_router(guides_v1.router, prefix="/api/v1/guides", tags=["guides"])
app.include_router(clerk_webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}


Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

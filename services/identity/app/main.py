from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import users as admin_users
from app.api.users import profile as users_profile
from app.api.webhooks import clerk as clerk_webhooks
from app.core.config import get_settings
from app.services.bootstrap import bootstrap_default_admin

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await bootstrap_default_admin()
    yield


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
app.include_router(clerk_webhooks.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}

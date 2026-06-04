from collections.abc import Callable

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from tip_common.config import BaseServiceSettings


def create_service_app(
    settings: BaseServiceSettings,
    routers: list[tuple[APIRouter, str, list[str] | None]],
    on_startup: Callable | None = None,
) -> FastAPI:
    app = FastAPI(
        title=f"TIP — {settings.service_name}",
        version=settings.app_version,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router, prefix, tags in routers:
        app.include_router(router, prefix=f"{settings.api_v1_prefix}{prefix}", tags=tags or [])

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": settings.service_name}

    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

    if on_startup:
        app.add_event_handler("startup", on_startup)

    return app

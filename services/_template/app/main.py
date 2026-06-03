from fastapi import APIRouter

from app.core.config import get_settings
from tip_common.app_factory import create_service_app

router = APIRouter()


@router.get("/")
async def list_items() -> dict[str, str]:
    settings = get_settings()
    return {"status": "not_implemented", "service": settings.service_name}


settings = get_settings()

app = create_service_app(
    settings=settings,
    routers=[
        (router, "/items", ["items"]),
    ],
)

from app.api.v1 import predict
from app.core.config import get_settings
from tip_common.app_factory import create_service_app

settings = get_settings()

app = create_service_app(
    settings=settings,
    routers=[
        (predict.router, "/analytics", ["analytics"]),
    ],
)

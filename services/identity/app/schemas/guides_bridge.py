from pydantic import BaseModel, Field


class GuidesBridgeConfigResponse(BaseModel):
    enabled: bool
    company_slug: str
    bridge_email: str
    password_configured: bool
    configured_in_database: bool
    api_url: str
    web_url: str
    proxy_web_url: str


class GuidesBridgeConfigUpdate(BaseModel):
    company_slug: str = Field(min_length=2, max_length=64)
    bridge_email: str = Field(min_length=3, max_length=255)
    password: str | None = Field(default=None, min_length=1, max_length=256)


class GuidesBridgeTestResponse(BaseModel):
    success: bool
    message: str
    email: str | None = None
    role: str | None = None

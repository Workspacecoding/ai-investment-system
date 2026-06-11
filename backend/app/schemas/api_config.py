from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiConfigCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    extra_params: dict | None = None
    headers: dict | None = None
    is_active: bool = True
    crawl_enabled: bool = False
    crawl_time: str | None = None


class ApiConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    extra_params: dict | None = None
    headers: dict | None = None
    is_active: bool | None = None
    crawl_enabled: bool | None = None
    crawl_time: str | None = None


class ApiConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None
    base_url: str | None
    api_key: str | None
    extra_params: dict | None
    headers: dict | None
    is_active: bool
    crawl_enabled: bool
    crawl_time: str | None
    created_at: datetime

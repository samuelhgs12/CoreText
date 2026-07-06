from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None = None
    email: str | None = None
    created_at: datetime


class AuthRegisterRequest(BaseModel):
    full_name: str = Field(min_length=1)
    username: str | None = Field(default=None, min_length=1)
    email: str = Field(min_length=1)
    password: str = Field(min_length=8)


class AuthLoginRequest(BaseModel):
    email: str | None = Field(default=None, min_length=1)
    identifier: str | None = Field(default=None, min_length=1)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    token_type: Literal["bearer"] = "bearer"
    access_token: str
    user: UserOut


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    username: str | None = Field(default=None, min_length=1)
    email: str | None = Field(default=None, min_length=1)


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str
    file_size_bytes: int
    owner_id: int
    uploaded_at: datetime


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    content: str
    generation_time_ms: float
    created_at: datetime


class IntegratedSummaryRequest(BaseModel):
    file_ids: list[int] = Field(
        min_length=1, description="IDs dos arquivos PDF a serem resumidos em conjunto."
    )


class IntegratedSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_ids: list[int]
    content: str
    generation_time_ms: float
    created_at: datetime


class DashboardMetricOut(BaseModel):
    label: str
    value: str
    hint: str
    icon: str
    variant: str


class DashboardRecentSummaryOut(BaseModel):
    id: str
    file: str
    details: str
    summary: str
    status: str
    date: datetime
    type: Literal["individual", "integrated"]


class DashboardOut(BaseModel):
    metrics: list[DashboardMetricOut]
    recent_summaries: list[DashboardRecentSummaryOut]

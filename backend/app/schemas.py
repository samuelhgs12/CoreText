from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    owner_id: int
    uploaded_at: datetime


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    content: str
    generation_time_ms: float
    created_at: datetime

from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"
    DELETED = "DELETED"

class UserRole(str, Enum):
    USER = "USER"
    SMART = "SMART"
    ADMIN = "ADMIN"

class User(BaseModel):
    id: Optional[int] = None
    telegram_id: Optional[str] = None
    discord_id: Optional[str] = None
    nickname: str
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('telegram_id', 'discord_id', mode='before')
    @classmethod
    def convert_ids_to_str(cls, value):
        if value is not None:
            return str(value)
        return value
from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

class TelegramAuthPayload(BaseModel):
    id_token: Optional[str] = Field(None, description="OIDC JWT token from Telegram Login")
    init_data: Optional[str] = Field(None, description="Raw initData string from Telegram Mini App")

class LinkSocialPayload(BaseModel):
    telegram_id: Optional[str] = Field(None, description="Telegram ID")
    discord_id: Optional[str] = Field(None, description="Discord ID")

    @model_validator(mode='after')
    def check_exactly_one_id(self):
        if bool(self.telegram_id) == bool(self.discord_id):
            raise ValueError('Must provide exactly one of: telegram_id or discord_id')
        return self

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"
    DELETED = "DELETED"

class User(BaseModel):
    id: Optional[int] = None
    telegram_id: Optional[str] = None
    discord_id: Optional[str] = None
    nickname: str
    avatar_url: Optional[str] = None
    role: str = "USER"
    status: UserStatus = UserStatus.ACTIVE
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('telegram_id', 'discord_id', mode='before')
    @classmethod
    def convert_ids_to_str(cls, value):
        if value is not None:
            return str(value)
        return value

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: User

class RefreshRequest(BaseModel):
    refresh_token: str
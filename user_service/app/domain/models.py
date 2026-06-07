from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

class ProviderPayload(BaseModel):
    provider: str = Field(..., pattern="^(telegram|discord)$", description="Social network provider")
    provider_id: int = Field(..., description="ID from the social network")
    nickname: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = None

class LinkPayload(BaseModel):
    provider: str = Field(..., pattern="^(telegram|discord)$")
    provider_id: int

class User(BaseModel):
    id: Optional[int] = None
    telegram_id: Optional[int] = None
    discord_id: Optional[int] = None
    nickname: str
    avatar_url: Optional[str] = None
    role: str = "USER"
    is_banned: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    def has_any_social_link(self) -> bool:
        return self.telegram_id is not None or self.discord_id is not None

class UserLinkDTO(BaseModel):
    telegram_id: Optional[int] = Field(None, description="Telegram ID")
    discord_id: Optional[int] = Field(None, description="Discord ID")
    nickname: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=255, description="URL avatar from Telegram/Discord profile")

    @model_validator(mode='after')
    def check_at_least_one_id(self):
        if not self.telegram_id and not self.discord_id:
            raise ValueError('Must be telegram_id or discord_id')
        return self

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: User
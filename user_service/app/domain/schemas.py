from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.domain.models import User

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

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: User

class RefreshRequest(BaseModel):
    refresh_token: str
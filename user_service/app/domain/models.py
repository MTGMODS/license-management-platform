from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

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
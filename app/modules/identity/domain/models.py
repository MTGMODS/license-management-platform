from typing import Optional
from pydantic import BaseModel

class User(BaseModel):
    id: Optional[int] = None
    telegram_id: Optional[int] = None
    discord_id: Optional[int] = None
    nickname: str

    def has_any_social_link(self) -> bool:
        return self.telegram_id is not None or self.discord_id is not None
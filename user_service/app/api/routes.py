from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.shared.database import get_db
from app.application.service import UserService
from app.domain.models import User

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

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

@router.post("", response_model=User)
async def register_or_update_user(payload: UserLinkDTO, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    
    user = await service.link_account(
        nickname=payload.nickname, 
        telegram_id=payload.telegram_id, 
        discord_id=payload.discord_id,
        avatar_url=payload.avatar_url
    )
    
    return user
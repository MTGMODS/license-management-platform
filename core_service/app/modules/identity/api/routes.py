from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from ..application.service import IdentityService

router = APIRouter(prefix="/api/v1/identity", tags=["Identity (Users)"])

class UserLinkDTO(BaseModel):
    telegram_id: Optional[int] = Field(None, gt=0, description="Telegram ID")
    discord_id: Optional[int] = Field(None, gt=0, description="Discord ID")
    nickname: str = Field(..., min_length=0, max_length=50)

    @model_validator(mode='after')
    def check_at_least_one_id(self):
        if not self.telegram_id and not self.discord_id:
            raise ValueError('Must provide either telegram_id or discord_id')
        return self

@router.post("/users")
def register_or_update_user(payload: UserLinkDTO, db: Session = Depends(get_db)):
    try:
        service = IdentityService(db)
        user = service.link_account(payload.nickname, payload.telegram_id, payload.discord_id)
        return {"status": "success", "user_id": user.id, "nickname": user.nickname}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="IDENTITY_ERROR")
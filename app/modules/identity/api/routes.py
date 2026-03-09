from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.shared.database import get_db
from ..application.service import IdentityService

router = APIRouter(prefix="/api/v1/identity", tags=["Identity (Users)"])

class UserLinkDTO(BaseModel):
    telegram_id: int
    nickname: str

@router.post("/users")
def register_or_update_user(payload: UserLinkDTO, db: Session = Depends(get_db)):
    service = IdentityService(db)
    user = service.register_telegram_user(payload.telegram_id, payload.nickname)
    
    return {"status": "success", "user_id": user.id, "nickname": user.nickname}
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.application.service import UserService
from app.domain.models import User, UserLinkDTO

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

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
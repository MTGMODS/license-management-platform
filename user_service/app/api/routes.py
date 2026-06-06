from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.application.service import UserService
from app.domain.models import UserLinkDTO, TokenResponse
from app.application.jwt_utils import create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

@router.post("", response_model=TokenResponse)
async def register_or_update_user(payload: UserLinkDTO, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    
    user = await service.link_account(
        nickname=payload.nickname, 
        telegram_id=payload.telegram_id, 
        discord_id=payload.discord_id,
        avatar_url=payload.avatar_url
    )
    
    access_tk = create_access_token(user_id=user.id, role=user.role)
    refresh_tk = create_refresh_token(user_id=user.id)
    
    return TokenResponse(
        access_token=access_tk,
        refresh_token=refresh_tk,
        user=user
    )
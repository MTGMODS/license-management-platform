from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.application.user_service import UserService
from app.domain.models import SocialIDPayload, SyncPayload, User
from app.application.jwt_utils import get_current_user_id

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

@router.get("/me", response_model=User)
async def get_my_profile(current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.get_user_by_id(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/me/link", response_model=User)
async def link_social_account(payload: SocialIDPayload, current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.link_social(
        user_id=current_user_id,
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )

@router.put("/sync", response_model=User)
async def sync_game_server_data(
    payload: SyncPayload, 
    db: AsyncSession = Depends(get_db),
    # x_worker_secret: str = Header(None)
):
    # if x_worker_secret != settings.WORKER_SECRET:
    #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Worker Secret")

    service = UserService(db)
    return await service.sync_profile(
        nickname=payload.nickname,
        avatar_url=payload.avatar_url,
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )
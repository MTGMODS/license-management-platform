from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.application.user_service import UserService
from app.domain.models import LinkSocialPayload, User
from app.application.jwt_utils import get_current_user_id

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

@router.get("/me", response_model=User)
async def get_my_profile(current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.get_user_by_id(current_user_id)

@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.delete_my_account(current_user_id)

@router.post("/me/link", response_model=User)
async def link_social_account(payload: LinkSocialPayload, current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.link_social(
        user_id=current_user_id,
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )
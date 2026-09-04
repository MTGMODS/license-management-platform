from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.application.user_service import UserService
from app.domain.models import User
from app.domain.schemas import UpdateUser
from app.application.jwt_utils import get_admin_user_id

router = APIRouter(prefix="/api/v1/users", tags=["Admin Panel"])

@router.get("/search", response_model=List[User])
async def admin_search_users(
    nickname: Optional[str] = None,
    telegram_id: Optional[str] = None,
    discord_id: Optional[str] = None,
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db)
    return await service.search_users_for_admin(nickname=nickname, telegram_id=telegram_id, discord_id=discord_id)

@router.get("/{user_id}", response_model=User)
async def admin_get_user(user_id: int, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.get_user_for_admin(user_id)

@router.patch("/{user_id}", description="Update user status, role, or unlink social accounts")
async def update_user_admin(user_id: int, payload: UpdateUser, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    updated_user = await service.admin_update_user(user_id, payload)
    return {"status": "success", "message": "User updated successfully", "data": updated_user}
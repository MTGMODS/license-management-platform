from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.application.user_service import UserService
from app.domain.models import User
from app.application.jwt_utils import get_admin_user_id

router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin Panel"])

@router.get("/{user_id}", response_model=User)
async def admin_get_user(user_id: int, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    return await service.get_user_for_admin(user_id)
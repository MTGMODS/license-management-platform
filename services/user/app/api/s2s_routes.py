from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.shared.database import get_db
from app.application.user_service import UserService
from app.shared.config import settings

router = APIRouter(prefix="/api/v1/users", tags=["Service-to-Service"])

async def verify_s2s_access(x_internal_token: str = Header(None)):
    if not x_internal_token or x_internal_token != settings.INTERNAL_SECRET_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden: S2S Token Invalid")
    return True

@router.get("/resolve", dependencies=[Depends(verify_s2s_access)])
async def s2s_resolve_user(telegram_id: Optional[int] = None, discord_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user_id = await service.resolve_social_id(telegram_id=telegram_id, discord_id=discord_id)
    
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found by social ID")
        
    return {"user_id": user_id}

@router.get("/{user_id}/socials", dependencies=[Depends(verify_s2s_access)])
async def s2s_get_socials(user_id: int, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    socials = await service.get_social_ids(user_id)
    
    if not socials:
        raise HTTPException(status_code=404, detail="User not found")
        
    return socials


@router.get("/{user_id}/profile", dependencies=[Depends(verify_s2s_access)])
async def s2s_get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    profile = await service.get_profile_for_s2s(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile
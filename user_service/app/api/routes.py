from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.application.service import UserService
from app.domain.models import SocialIDPayload, SyncPayload, TokenResponse, User , RefreshRequest
from app.application.jwt_utils import create_access_token, create_refresh_token, get_current_user_id, verify_refresh_token

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

@router.post("/auth", response_model=TokenResponse)
async def authenticate_user(payload: SocialIDPayload, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    
    user = await service.authenticate(
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )
    
    return TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )

@router.get("/me", response_model=User)
async def get_my_profile(current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.get_user_by_id(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/me/link", response_model=User)
async def link_social_account(
    payload: SocialIDPayload, 
    current_user_id: int = Depends(get_current_user_id), 
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db)
    return await service.link_social(
        user_id=current_user_id,
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )

@router.put("/sync", status_code=204)
async def sync_user_data(payload: SyncPayload, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    await service.sync_profile(
        nickname=payload.nickname,
        avatar_url=payload.avatar_url,
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id
    )
    return None

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token using refresh token")
async def refresh_session(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = verify_refresh_token(payload.refresh_token)
    
    service = UserService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User associated with this token not found")
        
    if user.is_banned:
        raise HTTPException(status_code=403, detail="User account is banned")

    new_access_token = create_access_token(user_id=user.id, role=user.role)
    new_refresh_token = create_refresh_token(user_id=user.id)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=user
    )
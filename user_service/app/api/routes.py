from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.shared.database import get_db
from app.application.service import UserService
from app.domain.models import SocialIDPayload, SyncPayload, TokenResponse, User
from app.application.jwt_utils import create_access_token, create_refresh_token, get_current_user_id
from app.shared.config import settings

router = APIRouter(prefix="/api/v1/users", tags=["Users Service"])

@router.post("/auth", response_model=TokenResponse)
async def authenticate_user(payload: SocialIDPayload, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    
    user = await service.authenticate(
        telegram_id=payload.telegram_id,
        discord_id=payload.discord_id,
        nickname=payload.nickname,
        avatar_url=payload.avatar_url
    )
    
    return TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )

@router.get("/auth/discord/login", summary="Initiate Discord OAuth2 Flow")
async def discord_oauth_login():
    url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={settings.DISCORD_CLIENT_ID}"
        f"&redirect_uri={settings.DISCORD_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=identify"
    )
    return RedirectResponse(url)

@router.get("/auth/discord/callback", response_model=TokenResponse, summary="Discord OAuth2 Callback Receiver")
async def discord_oauth_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_data = {
            "client_id": settings.DISCORD_CLIENT_ID,
            "client_secret": settings.DISCORD_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.DISCORD_REDIRECT_URI,
        }
        token_headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        token_res = await client.post("https://discord.com/api/oauth2/token", data=token_data, headers=token_headers)
        if token_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange authorization code with Discord")
        
        discord_access_token = token_res.json().get("access_token")

        profile_headers = {"Authorization": f"Bearer {discord_access_token}"}
        profile_res = await client.get("https://discord.com/api/users/@me", headers=profile_headers)
        if profile_res.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch user profile from Discord")
        
        discord_profile = profile_res.json()

    discord_id = int(discord_profile["id"])
    nickname = discord_profile["username"]
    avatar_hash = discord_profile.get("avatar")
    
    avatar_url = None
    if avatar_hash:
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"

    service = UserService(db)
    user = await service.authenticate(
        discord_id=discord_id,
        nickname=nickname,
        avatar_url=avatar_url
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
async def link_social_account(payload: SocialIDPayload, current_user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
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
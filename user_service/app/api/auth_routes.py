import httpx, json, secrets
from urllib.parse import parse_qsl
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status 
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.application.auth_service import AuthService
from app.domain.models import TokenResponse, RefreshRequest, TelegramAuthPayload
from app.application.jwt_utils import (create_access_token, create_refresh_token, verify_refresh_token, verify_telegram_oidc, verify_telegram_webapp_hash)
from app.shared.config import settings

router = APIRouter(prefix="/api/v1/users/auth", tags=["Authentication"])

@router.get("/telegram/login")
async def telegram_login_init():
    url = (
        "https://oauth.telegram.org/auth"
        f"?client_id={settings.TELEGRAM_CLIENT_ID}"
        f"&redirect_uri={settings.TELEGRAM_CALLBACK_URL}"
        "&response_type=code"
        "&scope=openid%20profile"
    )
    return RedirectResponse(url)

@router.get("/telegram/callback", response_model=TokenResponse)
async def telegram_auth_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        data = {
            "client_id": settings.TELEGRAM_CLIENT_ID,
            "client_secret": settings.TELEGRAM_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.TELEGRAM_CALLBACK_URL,
        }
        resp = await client.post("https://oauth.telegram.org/token", data=data)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
            
        id_token = resp.json().get("id_token")
        
    token_data = verify_telegram_oidc(id_token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram OIDC token signature.")
        
    tg_id = int(token_data.get("id"))
    nickname = token_data.get("preferred_username") or token_data.get("name") or tg_id
    avatar_url = token_data.get("picture")

    service = AuthService(db)
    user = await service.login_with_telegram(
        telegram_id=tg_id,
        nickname=nickname[:50],
        avatar_url=avatar_url
    )
    
    return TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )

@router.post("/telegram/webapp", response_model=TokenResponse)
async def telegram_webapp_auth(payload: TelegramAuthPayload, db: AsyncSession = Depends(get_db)):
    if not payload.init_data:
        raise HTTPException(status_code=400, detail="Missing init_data in payload")

    is_valid = verify_telegram_webapp_hash(payload.init_data, settings.TELEGRAM_BOT_TOKEN)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Telegram Mini App signature.")

    parsed_data = dict(parse_qsl(payload.init_data))
    user_data_str = parsed_data.get("user", "{}")
    try:
        user_data = json.loads(user_data_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid user JSON in initData")

    tg_id = user_data.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="User ID not found in initData")

    nickname = user_data.get("username") or user_data.get("first_name") or f"tg_{tg_id}"
    avatar_url = user_data.get("photo_url")

    service = AuthService(db)
    user = await service.login_with_telegram(
        telegram_id=int(tg_id),
        nickname=nickname[:50],
        avatar_url=avatar_url
    )
    
    return TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )

@router.get("/discord/login", summary="Initiate Discord OAuth2 Flow")
async def discord_oauth_login():
    state = secrets.token_urlsafe(16)
    url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={settings.DISCORD_CLIENT_ID}"
        f"&redirect_uri={settings.DISCORD_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=identify"
        f"&state={state}"
    )
    response = RedirectResponse(url)
    response.set_cookie(
        key="oauth_state", 
        value=state, 
        httponly=True, 
        max_age=300,
        secure=not settings.DEBUG_MODE,
        samesite="lax"
    )
    return response

@router.get("/discord/callback", response_model=TokenResponse, summary="Discord OAuth2 Callback Receiver")
async def discord_oauth_callback(request: Request, code: str, state: str = None, db: AsyncSession = Depends(get_db)):
    saved_state = request.cookies.get("oauth_state")
    if not state or not saved_state or state != saved_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="CSRF validation failed. State parameter is missing or invalid."
        )
    
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
    nickname = discord_profile["username"] or discord_id
    avatar_hash = discord_profile.get("avatar")
    
    avatar_url = None
    if avatar_hash:
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"

    service = AuthService(db)
    user = await service.login_with_discord(
        discord_id=discord_id,
        nickname=nickname[:50],
        avatar_url=avatar_url
    )

    response = TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )

    return response

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = verify_refresh_token(request.refresh_token)
    service = AuthService(db)
    user = await service.repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="User is banned")

    return TokenResponse(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=create_refresh_token(user_id=user.id),
        user=user
    )
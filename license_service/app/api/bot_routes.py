from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.config import settings
from app.domain.models import PaymentMethod
from app.domain.schemas import GeneratePurchaseDTO, TelegramBotGenerateDTO
from app.application.service import LicenseService

router = APIRouter(prefix="/api/v1/license", tags=["Bots Integration"])

async def verify_bot_access(x_bot_token: str = Header(None)):
    if not x_bot_token or x_bot_token != settings.BOT_SECRET_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Bot Token")
    return True

@router.post("/generate/telegram_bot", description="Auto-generate key after TG bot payment")
async def tg_bot_generate_key(payload: TelegramBotGenerateDTO, is_bot: bool = Depends(verify_bot_access), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    new_payload = GeneratePurchaseDTO(duration_days=payload.duration_days, amount=payload.amount, method=PaymentMethod.STARS)
    result = await service.generate_and_bill(new_payload)
    return {"status": "success", "data": result}

@router.get("/check/info", description="Check user license from media ids")
async def check_bot_status(telegram_id: int = None, discord_id: int = None, is_bot: bool = Depends(verify_bot_access), db: AsyncSession = Depends(get_db)):
    if not telegram_id and not discord_id:
        raise HTTPException(status_code=400, detail="Provide telegram_id or discord_id")
    if telegram_id and discord_id:
        raise HTTPException(status_code=400, detail="Provide only one of telegram_id or discord_id")

    service = LicenseService(db)
    return await service.get_bot_info_by_social(telegram_id=telegram_id, discord_id=discord_id)
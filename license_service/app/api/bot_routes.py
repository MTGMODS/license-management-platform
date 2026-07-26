from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_db
from app.shared.config import settings
from app.domain.schemas import GeneratePurchaseDTO, TelegramBotGenerateDTO
from app.application.service import LicenseService

router = APIRouter(prefix="/api/v1/license", tags=["Telegram Bot Integration"])

async def verify_bot_access(x_bot_token: str = Header(None)):
    if not x_bot_token or x_bot_token != settings.BOT_SECRET_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Bot Token")
    return True

@router.post("/generate/telegram_bot", description="Auto-generate key after TG bot payment")
async def tg_bot_generate_key(payload: TelegramBotGenerateDTO, is_bot: bool = Depends(verify_bot_access), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    result = await service.generate_and_bill(payload)

    full_payload = GeneratePurchaseDTO(duration_days=payload.duration_days, amount=payload.amount, method="Telegram Stars")
    
    result = await service.generate_and_bill(full_payload)
    
    return {"status": "success", "data": result}
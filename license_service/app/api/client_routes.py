from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.domain.schemas import CheckRequestDTO
from app.application.service import LicenseService

router = APIRouter(prefix="/api/v1/client", tags=["Client (In-Game)"])

@router.post("/check", description="Check license & hwid for access")
async def check_license(payload: CheckRequestDTO, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.headers.get("X-Forwarded-For", request.client.host)
    user_agent = request.headers.get("User-Agent", "Unknown")

    service = LicenseService(db)
    result = await service.check_access(key=payload.key, device=payload.device, ip_address=ip, user_agent=user_agent)
    
    return {"valid": True, "message": "Access granted", "data": result}
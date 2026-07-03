from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.application.service import UsageService
from app.domain.models import LaunchPayload
from app.infrastructure.geoip import get_country_iso_code

router = APIRouter(prefix="/api/v1/usage", tags=["Usage Analytics"])

@router.post("/launch")
async def log_launch(data: LaunchPayload, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        client_host = request.client.host if request.client else "127.0.0.1"
        raw_ip = request.headers.get("X-Forwarded-For", client_host)
        ip = raw_ip.split(",")[0].strip()

        country_code = get_country_iso_code(ip)

        service = UsageService(db)
        return await service.log_launch(
            version=data.version,
            mode=data.mode,
            hwid=data.hwid,
            server=data.server,
            device=data.device,
            country=country_code
        )

    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="USAGE_ERROR")
    
@router.get("/stats/public")
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    service = UsageService(db)
    return await service.get_website_stats()
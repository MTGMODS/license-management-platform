from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.application.service import UsageService
from app.domain.models import LaunchDTO

router = APIRouter(prefix="/api/v1/usage", tags=["Usage Analytics"])

@router.post("/launch")
async def log_launch(data: LaunchDTO, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        ip = request.headers.get("X-Forwarded-For", request.client.host)

        return await UsageService(db).log_launch(
            version=data.version,
            hwid=data.hwid,
            server=data.server,
            device=data.device,
            country='UA' # temp
        )

    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="USAGE_ERROR")
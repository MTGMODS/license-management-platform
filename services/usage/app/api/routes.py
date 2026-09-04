from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.application.service import UsageService
from app.domain.models import LaunchPayload

router = APIRouter(prefix="/api/v1/usage", tags=["Usage Analytics"])

@router.post("/launch")
async def log_launch(data: LaunchPayload, db: AsyncSession = Depends(get_db)):
    try:
        service = UsageService(db)
        return await service.log_launch(version=data.version, mode=data.mode, hwid=data.hwid, server=data.server, device=data.device)
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="USAGE_ERROR")
    
@router.get("/stats/public")
async def get_public_stats(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    service = UsageService(db)
    return await service.get_website_stats(background_tasks)

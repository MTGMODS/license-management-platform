from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.application.service import LicenseStatsService

router = APIRouter(prefix="/api/v1/license", tags=["Stats"])

@router.get("/stats/public", description="Get public VIP sales stats (Old vs New)")
async def get_public_stats(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    service = LicenseStatsService(db)
    stats = await service.get_website_stats(background_tasks)
    return {"status": "success", "data": stats}

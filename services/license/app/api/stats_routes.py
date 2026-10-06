from fastapi import APIRouter, BackgroundTasks, Request, Response
from app.shared.tariffs import public_tariffs
from app.application.service import LicenseStatsService

router = APIRouter(prefix="/api/v1/license", tags=["Stats"])

@router.get("/stats/public", description="Public time-limited subscription sales analytics")
async def get_public_stats(request: Request, background_tasks: BackgroundTasks):
    service = LicenseStatsService(request.app.state.public_stats_cache)
    return await service.get_website_stats(background_tasks)

@router.get("/stats/old", description="Legacy lifetime license statistics with a shared Redis cache")
async def get_old_stats(request: Request, background_tasks: BackgroundTasks, response: Response):
    response.headers["Cache-Control"] = "no-store"
    service = LicenseStatsService(request.app.state.old_stats_cache)
    return await service.get_old_stats(background_tasks)

@router.get("/tariffs", description="Catalog prices and per-plan device limits for the site and bots.")
async def get_tariffs():
    return {"status": "success", "data": public_tariffs()}

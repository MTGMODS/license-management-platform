from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.shared.database import get_db
from app.application.service import LicenseStatsService

router = APIRouter(prefix="/api/v1/license", tags=["Stats"])

@router.get("/stats/public", description="Get public VIP sales stats (Old vs New)")
async def get_public_stats(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    service = LicenseStatsService(db)
    stats = await service.get_website_stats(background_tasks)
    return {"status": "success", "data": stats}

@router.get("/stats/query/schema", description="Get Explorer Schema")
async def get_explorer_schema():
    return {
        "metrics": ["revenue", "purchases", "licenses", "active_licenses", "free_licenses", "avg_check"],
        "groups": ["method", "duration", "status", "date", "hour", "weekday", "user_id"],
        "periods": ["all", "30d", "24h", "1h"],
        "filters": ["method", "duration", "status", "user_id"]
    }

@router.get("/stats/query", description="Get Explorer Query")
async def get_explorer_query(
    metric: str = Query("revenue,purchases", description="Comma-separated metrics"),
    group_by: Optional[str] = Query(None, description="method, duration, status, date, hour, weekday, user_id"),
    period: str = Query("all", description="all, 30d, 24h, 1h"),
    method: Optional[str] = Query(None),
    duration: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    sort: Optional[str] = Query("-revenue", description="Sort field. Use '-' for DESC"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseStatsService(db)
    
    metrics_list = [m.strip() for m in metric.split(",") if m.strip()]
    
    raw_filters = {"method": method, "duration": duration, "status": status, "user_id": user_id}
    filters = {k: v for k, v in raw_filters.items() if v is not None}
    
    data = await service.get_explorer_stats(
        metrics=metrics_list, group_by=group_by, period=period, 
        filters=filters, sort=sort, limit=limit, offset=offset
    )
    
    return {
        "query": {
            "metrics": metrics_list, "group_by": group_by, "period": period,
            "filters": filters, "sort": sort, "limit": limit, "offset": offset
        },
        "data": data
    }
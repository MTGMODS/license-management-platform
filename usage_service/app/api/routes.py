from fastapi import APIRouter, Depends, Request, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.application.service import UsageService
from app.domain.models import LaunchPayload
from app.infrastructure.geoip import get_country_iso_code
from typing import Optional

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
async def get_public_stats(background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    service = UsageService(db)
    return await service.get_website_stats(background_tasks)

@router.get("/stats/query/schema")
async def get_explorer_schema():
    return {
        "metrics": ["users", "launches", "vip_users", "free_users", "vip_percent", "launches_per_user"],
        "groups": ["server", "country", "mode", "device", "version", "date", "hour", "weekday"],
        "periods": ["all", "30d", "24h", "1h"],
        "filters": ["server", "mode", "country", "device", "version", "vip"]
    }

@router.get("/stats/query")
async def get_explorer_query(
    metric: str = Query("users", description="Comma-separated: users,launches,vip_users,free_users,vip_percent,launches_per_user"),
    group_by: Optional[str] = Query(None, description="server, country, mode, version, device, date, hour, weekday"),
    period: str = Query("all", description="all, 30d, 24h, 1h"),
    server: Optional[int] = Query(None),
    mode: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    device: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    vip: Optional[bool] = Query(None),
    sort: Optional[str] = Query("-users", description="Sort field. Use '-' for DESC, e.g. -users"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    service = UsageService(db)
    
    metrics_list = [m.strip() for m in metric.split(",") if m.strip()]
    
    raw_filters = {
        "server": server, "mode": mode, "country": country, 
        "device": device, "version": version, "vip": vip
    }
    filters = {k: v for k, v in raw_filters.items() if v is not None}
    
    data = await service.get_explorer_stats(
        metrics=metrics_list, 
        group_by=group_by, 
        period=period, 
        filters=filters, 
        sort=sort, 
        limit=limit, 
        offset=offset
    )
    
    return {
        "query": {
            "metrics": metrics_list,
            "group_by": group_by,
            "period": period,
            "filters": filters,
            "sort": sort,
            "limit": limit,
            "offset": offset
        },
        "data": data
    }
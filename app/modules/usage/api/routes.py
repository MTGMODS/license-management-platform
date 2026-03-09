from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.shared.database import get_db
from ..application.service import UsageService

router = APIRouter(prefix="/api/v1/usage", tags=["Usage Analytics"])

class LaunchDTO(BaseModel):
    version: str
    device_type: int  # 0 = PC, 1 = Mobile
    server_id: str

@router.post("/launch")
async def log_launch(payload: LaunchDTO, request: Request, db: Session = Depends(get_db)):
    # Імітація твого get_country (спрощено для лаби)
    ip = request.headers.get("X-Forwarded-For", request.client.host)
    country = "UA" # Тут потім підключиш geoip2
    device_str = "PC" if payload.device_type == 0 else "Mobile"

    service = UsageService(db)
    service.log_launch(payload.version, device_str, payload.server_id, country)
    
    return {"status": "success", "message": "Launch logged"}
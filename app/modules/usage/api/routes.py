from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from ..application.service import UsageService

router = APIRouter(prefix="/api/v1/usage", tags=["Usage Analytics"])

class LaunchDTO(BaseModel):
    version: str = Field(..., min_length=1, max_length=20)
    device_type: int = Field(..., ge=0, le=1, description="0: PC, 1: Mobile")
    server_id: str = Field(..., min_length=1, max_length=50)

@router.post("/launch")
async def log_launch(payload: LaunchDTO, request: Request, db: Session = Depends(get_db)):
    try:
        ip = request.headers.get("X-Forwarded-For", request.client.host)
        country = "UA"
        device_str = "PC" if payload.device_type == 0 else "Mobile"

        service = UsageService(db)
        service.log_launch(payload.version, device_str, payload.server_id, country)
        
        return {"status": "success", "message": "Launch logged"}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="USAGE_ERROR")
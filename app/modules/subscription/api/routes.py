from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.shared.database import get_db
from ..application.service import SubscriptionService
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/subscription", tags=["Subscription"])

class CheckRequestDTO(BaseModel):
    key: str
    device: str

@router.post("/check")
def check_subscription(payload: CheckRequestDTO, db: Session = Depends(get_db)):
    service = SubscriptionService(db)
    is_valid = service.check_access(payload.key)
    
    if not is_valid:
        return {"valid": False, "message": "Key is invalid or expired"}
        
    return {"valid": True, "message": "Access granted"}
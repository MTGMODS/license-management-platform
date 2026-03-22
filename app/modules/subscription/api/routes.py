from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.modules.billing.application.service import BillingService
from ..application.service import SubscriptionService

router = APIRouter(prefix="/api/v1/subscription", tags=["Subscription"])

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key", examples=["XXXX-XXXX-XXXX-XXXX"])
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

@router.post("/check")
def check_subscription(payload: CheckRequestDTO, request: Request, db: Session = Depends(get_db)):
    try:
        ip = request.headers.get("X-Forwarded-For", request.client.host)
        user_agent = request.headers.get("User-Agent", "Unknown")

        service = SubscriptionService(db)
        is_valid = service.check_access(payload.key, payload.device, ip, user_agent)
        
        if not is_valid:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
            
        return {"valid": True, "message": "Access granted"}
    except DomainException:
        raise
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="SUBSCRIPTION_ERROR")
    

class KeyCreateDTO(BaseModel):
    duration_days: int = Field(..., ge=-1)

@router.post("/generate", tags=["Subscription"])
def generate_new_key(payload: KeyCreateDTO, db: Session = Depends(get_db)):
    service = SubscriptionService(db)
    new_key = service.generate_unactivated_key(payload.duration_days)
    return {"status": "success", "key": new_key}

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key", examples=["XXXX-XXXX-XXXX-XXXX"])
    user_id: int

@router.post("/activate", tags=["Subscription"])
def activate_key(payload: ActivateKeyDTO, db: Session = Depends(get_db)):
    sub_service = SubscriptionService(db)
    subscription_id = sub_service.activate_key_for_user(payload.key, payload.user_id)
    if not subscription_id:
        raise DomainException(message="Invalid key or already activated", status_code=400)
    
    billing_service = BillingService(db)
    billing_service.complete_pending_purchase(subscription_id=subscription_id, user_id=payload.user_id)

    return {"status": "success", "message": "Subscription activated successfully"}
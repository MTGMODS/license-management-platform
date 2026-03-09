from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from ..application.service import SubscriptionService

router = APIRouter(prefix="/api/v1/subscription", tags=["Subscription"])

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=10, max_length=64, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

@router.post("/check")
def check_subscription(payload: CheckRequestDTO, db: Session = Depends(get_db)):
    try:
        service = SubscriptionService(db)
        is_valid = service.check_access(payload.key)
        
        if not is_valid:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
            
        return {"valid": True, "message": "Access granted"}
    except DomainException:
        raise
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="SUBSCRIPTION_ERROR")
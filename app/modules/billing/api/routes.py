from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from ..application.service import BillingService

router = APIRouter(prefix="/api/v1/billing", tags=["Billing System"])

class PurchaseDTO(BaseModel):
    user_id: Optional[int] = Field(None, gt=0)
    subscription_id: Optional[int] = Field(None, gt=0)
    amount: float = Field(..., gt=0.0)
    method: str = Field(..., description="Payment method")
    status: str = Field("COMPLETED", description="PENDING or COMPLETED")

    @field_validator('method')
    def validate_method(cls, v):
        allowed = ["Stars", "FunPay", "Crypto", "Card", "PayPal"]
        if v not in allowed:
            raise ValueError(f'Invalid payment method. Allowed: {allowed}')
        return v

@router.post("/purchase")
def register_purchase(payload: PurchaseDTO, db: Session = Depends(get_db)):
    try:
        service = BillingService(db)
        purchase = service.create_purchase(
            amount=payload.amount, 
            method=payload.method, 
            user_id=payload.user_id,
            subscription_id=payload.subscription_id,
            status=payload.status
        )
        return {"status": "success", "purchase_id": purchase.id, "message": f"Payment of ${payload.amount} recorded as {payload.status}."}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="BILLING_ERROR")
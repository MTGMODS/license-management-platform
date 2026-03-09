from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from ..application.service import BillingService

router = APIRouter(prefix="/api/v1/billing", tags=["Billing System"])

class PurchaseDTO(BaseModel):
    user_id: int = Field(..., gt=0)
    amount: float = Field(..., gt=0.0)
    method: str = Field(..., description="Payment method")

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
        purchase = service.process_payment(payload.user_id, payload.amount, payload.method)
        return {"status": "success", "purchase_id": purchase.id, "message": f"Payment of ${payload.amount} recorded."}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="BILLING_ERROR")
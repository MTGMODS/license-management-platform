from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.shared.database import get_db
from ..application.service import BillingService

router = APIRouter(prefix="/api/v1/billing", tags=["Billing System"])

class PurchaseDTO(BaseModel):
    user_id: int
    amount: float
    method: str

@router.post("/purchase")
def register_purchase(payload: PurchaseDTO, db: Session = Depends(get_db)):
    service = BillingService(db)
    service.process_payment(payload.user_id, payload.amount, payload.method)
    return {"status": "success", "message": f"Payment of ${payload.amount} via {payload.method} recorded."}
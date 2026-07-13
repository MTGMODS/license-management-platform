from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.shared.database import get_db
from app.domain.schemas import KeyCreateDTO, PurchaseCreateDTO
from app.application.service import LicenseService

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Panel"])

@router.post("/generate", description="Generate a new unactivated license key")
def generate_new_key(payload: KeyCreateDTO, db: Session = Depends(get_db)):
    service = LicenseService(db)
    new_key = service.generate_unactivated_key(payload.duration_days)
    return {"status": "success", "key": new_key}

@router.post("/billing/purchase", description="Register a new purchase transaction")
def register_purchase(payload: PurchaseCreateDTO, db: Session = Depends(get_db)):
    service = LicenseService(db)
    purchase = service.tx_repo.create(
        amount=payload.amount, 
        method=payload.method, 
        user_id=payload.user_id,
        license_id=payload.license_id,
        status=payload.status
    )
    return {
        "status": "success", 
        "purchase_id": purchase.id, 
        "message": f"Payment of ${payload.amount} recorded as {payload.status}."
    }
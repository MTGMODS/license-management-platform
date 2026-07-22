from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.domain.schemas import GeneratePurchaseDTO
from app.application.service import LicenseService

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Panel"])

@router.post("/generate", description="Generate a new license key and log a purchase transaction")
async def generate_new_key(payload: GeneratePurchaseDTO, db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    result = await service.generate_and_bill(payload)
    
    return {
        "status": "success", 
        "key": result["key"],
        "transaction_id": result["transaction_id"],
        "message": f"License created. Payment of {payload.amount} logged."
    }
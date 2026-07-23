from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.domain.schemas import GeneratePurchaseDTO
from app.domain.models import LicenseStatus
from app.application.service import LicenseService
from app.application.jwt_utils import get_admin_user_id

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Panel"])

@router.post("/generate", description="Generate a new unactivated license key")
async def generate_new_key(
    payload: GeneratePurchaseDTO, 
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseService(db)
    result = await service.generate_and_bill(payload)
    return {"status": "success", "data": result}

@router.get("/licenses", description="Get a list of all licenses")
async def get_all_licenses(
    limit: int = Query(100, ge=1, le=500), 
    offset: int = Query(0, ge=0),
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseService(db)
    licenses = await service.get_all_licenses_admin(limit, offset)
    return {"status": "success", "data": licenses}

@router.patch("/licenses/{license_id}/status", description="Ban, Unban or Expire a license")
async def change_license_status(
    license_id: int, 
    status: LicenseStatus, 
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseService(db)
    await service.update_license_status_admin(license_id, status)
    return {"status": "success", "message": f"License status changed to {status.value}"}

@router.delete("/devices/{device_id}", description="Manually remove a HWID lock (Admin override)")
async def admin_reset_device(
    device_id: int, 
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseService(db)
    await service.remove_device_admin(device_id)
    return {"status": "success", "message": "Device HWID removed manually."}
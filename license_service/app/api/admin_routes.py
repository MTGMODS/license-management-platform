from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.domain.schemas import GeneratePurchaseDTO, UpdateLicenseDTO
from app.domain.models import LicenseStatus
from app.application.service import LicenseService
from app.application.jwt_utils import get_admin_user_id

router = APIRouter(prefix="/api/v1/license", tags=["Admin Panel"])

@router.post("/generate", description="Generate a new unactivated license key")
async def generate_new_key(payload: GeneratePurchaseDTO, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    result = await service.generate_and_bill(payload)
    return {"status": "success", "data": result}

@router.get("/find", description="Find licenses by user_id or key")
async def admin_find_licenses(
    user_id: Optional[int] = Query(None, description="Search by owner User ID"),
    key: Optional[str] = Query(None, description="Search by exact License Key"),
    admin_id: int = Depends(get_admin_user_id),
    db: AsyncSession = Depends(get_db)
):
    service = LicenseService(db)
    result = await service.admin_find_licenses(user_id=user_id, key=key)
    return {"status": "success", "data": result}

@router.get("/{license_id}", description="Get a specific license by ID")
async def admin_get_license(license_id: int, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    result = await service.admin_get_license(license_id)
    return {"status": "success", "data": result}

@router.patch("/{license_id}", description="Update license status, reset limits, or max devices")
async def admin_update_license(license_id: int, payload: UpdateLicenseDTO, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    result = await service.admin_update_license(license_id, payload)
    return {"status": "success", "message": "License updated successfully", "data": result}

@router.delete("/devices/{device_id}", description="Manually remove a HWID lock (Admin override)")
async def admin_reset_device(device_id: int, admin_id: int = Depends(get_admin_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    await service.remove_device_admin(device_id)
    return {"status": "success", "message": "Device HWID removed manually."}
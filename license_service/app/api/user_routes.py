from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_db
from app.domain.schemas import ActivateKeyDTO
from app.application.service import LicenseService
from app.shared.exceptions import DomainException
from app.infrastructure.messaging import publish_file_generation_event
from app.application.jwt_utils import get_current_user_id 
from app.shared.datetime_utils import format_utc

router = APIRouter(prefix="/api/v1/license", tags=["User Dashboard"])

@router.post("/activate", description="Activate a license key for a user")
async def activate_key(payload: ActivateKeyDTO, user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    license_id = await service.activate_key_for_user(payload, user_id)
    await service.complete_purchase(license_id=license_id, user_id=user_id)
    return {"status": "success", "message": "License activated successfully"}

@router.post("/download", description="Request a download for a license key")
async def request_download(user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    db_sub = await service.get_active_license(user_id)
    expire_date = format_utc(db_sub.expires_at)
    try:
        download_url = await publish_file_generation_event(user_id=user_id, expire_date=expire_date)
        return {"status": "success", "message": "File generated successfully.", "download_url": download_url}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="FILE_GENERATION_FAILED")

@router.get("/info", description="Get dashboard info: license, purchase, and masked devices")
async def get_my_dashboard_info(user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    return await service.get_license_info(user_id)

@router.get("/history", description="Get dashboard old licenses history")
async def get_my_license_history(user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    return await service.get_license_history(user_id)

@router.delete("/device/{device_id}", description="Reset a specific device (Limit: 1)")
async def reset_my_device(device_id: int, user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    await service.reset_device(user_id, device_id)
    return {"status": "success", "message": "Device has been successfully unlinked."}
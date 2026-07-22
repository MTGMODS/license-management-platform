from fastapi import APIRouter, Depends
from app.shared.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.exceptions import DomainException
from app.domain.schemas import ActivateKeyDTO, DownloadRequestDTO
from app.application.service import LicenseService
from app.infrastructure.messaging import publish_file_generation_event

router = APIRouter(prefix="/api/v1/user", tags=["User Dashboard"])

@router.post("/activate", description="Activate a license key for a user")
async def activate_key(payload: ActivateKeyDTO, db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    license_id = await service.activate_key_for_user(payload.key, payload.user_id)
    await service.complete_pending_purchase(license_id=license_id, user_id=payload.user_id)
    return {"status": "success", "message": "License activated successfully"}

@router.post("/download", description="Request a download for a license key")
async def request_download(payload: DownloadRequestDTO, db: AsyncSession = Depends(get_db)):
    service = LicenseService(db)
    domain_sub = await service.validate_for_download(payload.key, payload.user_id)
    expire_date = domain_sub.expires_at.isoformat() if domain_sub.expires_at else None

    try:
        download_url = await publish_file_generation_event(user_id=payload.user_id, media_id=payload.user_id, expire_date=expire_date)
        return {"status": "success", "message": "File generated successfully.", "download_url": download_url}
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="FILE_GENERATION_FAILED")
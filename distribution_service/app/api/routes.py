import os
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from app.application.service import DistributionService, BUILDS_DIR
from app.shared.exceptions import DomainException

router = APIRouter(prefix="/api/v1/files", tags=["Downloads"])

@router.get("/downloads/vip/{token}")
async def download_vip(token: str, background_tasks: BackgroundTasks):
    filepath = os.path.join(BUILDS_DIR, f"{token}.lua")
    
    if not os.path.exists(filepath):
        raise DomainException(
            message="File not found or download link has expired.", 
            status_code=404, 
            error_code="FILE_NOT_FOUND"
        )
    
    background_tasks.add_task(DistributionService.remove_file, filepath)
    
    return FileResponse(path=filepath, filename="Arizona Helper.lua", media_type="application/octet-stream")
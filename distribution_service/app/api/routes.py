import os
from pathlib import Path as FilePath
from fastapi import APIRouter, BackgroundTasks, Path
from fastapi.responses import FileResponse
from app.application.service import DistributionService, BUILDS_DIR
from app.shared.exceptions import DomainException

BUILDS_DIR_PATH = FilePath(BUILDS_DIR).resolve()

router = APIRouter(prefix="/api/v1/files", tags=["Downloads"])

@router.get("/downloads/vip/{token}")
async def download_vip(background_tasks: BackgroundTasks, token: str = Path(..., pattern=r"^[a-f0-9]{10}$", description="10-character hex token")):
    filepath = (BUILDS_DIR_PATH / f"{token}.lua").resolve()

    if not filepath.is_relative_to(BUILDS_DIR_PATH):
        raise DomainException(
            message="Invalid path boundary.", 
            status_code=403, 
            error_code="FORBIDDEN_PATH"
        )
    
    if not filepath.exists():
        raise DomainException(
            message="File not found or download link has expired.", 
            status_code=404, 
            error_code="FILE_NOT_FOUND"
        )
    
    background_tasks.add_task(DistributionService.remove_file, str(filepath))
    
    return FileResponse(path=filepath, filename="Arizona Helper.lua", media_type="application/octet-stream")
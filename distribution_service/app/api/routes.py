import os
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from app.application.service import FileGeneratorService, BUILDS_DIR
from app.shared.exceptions import DomainException

router = APIRouter(prefix="/api/v1/files", tags=["Downloads"])

@router.get("/downloads/{filename}")
async def download_file(filename: str, background_tasks: BackgroundTasks):
    filepath = os.path.join(BUILDS_DIR, filename)
    
    if not os.path.exists(filepath):
        raise DomainException(
            message="File not found or download link has expired.", 
            status_code=404, 
            error_code="FILE_NOT_FOUND"
        )
    
    background_tasks.add_task(FileGeneratorService.remove_file, filepath)
    
    return FileResponse(path=filepath, filename="Arizona Helper.lua", media_type="application/octet-stream")
from pathlib import Path as FilePath
from fastapi import APIRouter, BackgroundTasks, Path
from fastapi.responses import FileResponse
from app.application.service import DistributionService, BUILDS_DIR, INSTALLER_TEMPLATE_PATH
from app.shared.exceptions import DomainException

BUILDS_DIR_PATH = FilePath(BUILDS_DIR).resolve()

router = APIRouter(prefix="/api/v1/files", tags=["Downloads"])

@router.get("/downloads/installer")
async def download_free_installer():
    template = FilePath(INSTALLER_TEMPLATE_PATH)
    if not template.is_file():
        raise DomainException("Windows installer is not available.", 503, "INSTALLER_UNAVAILABLE")
    return FileResponse(template, filename="Arizona&Rodina Helper.exe", media_type="application/octet-stream")


@router.get("/downloads/vip/{token}.exe")
async def download_vip_installer(background_tasks: BackgroundTasks, token: str = Path(..., pattern=r"^[a-f0-9]{10}$")):
    lua_file = BUILDS_DIR_PATH / f"{token}.lua"
    if not lua_file.is_file():
        raise DomainException("File not found or download link has expired.", 404, "FILE_NOT_FOUND")
    # Atomic, persistent claim: a second request must not stamp another EXE.
    # Keep this marker until Lua is consumed (or the old-build cleanup runs).
    used = BUILDS_DIR_PATH / f"{token}.exe.used"
    try:
        used.touch(exist_ok=False)
    except FileExistsError:
        raise DomainException("Installer link has already been used.", 404, "FILE_NOT_FOUND") from None

    try:
        try:
            executable = await DistributionService().build_vip_installer(token)
        except (FileNotFoundError, ValueError) as exc:
            raise DomainException("Windows installer is not available. Use the Lua download instead.", 503, "INSTALLER_UNAVAILABLE") from exc
        if not lua_file.is_file():
            DistributionService.remove_file(executable)
            raise DomainException("File not found or download link has expired.", 404, "FILE_NOT_FOUND")
    except BaseException:
        # A preparation failure/cancellation must not consume the download.
        used.unlink(missing_ok=True)
        raise

    # The installer still needs the Lua URL after the EXE has been downloaded.
    background_tasks.add_task(DistributionService.remove_file, executable)
    return FileResponse(executable, filename="Arizona&Rodina Helper.exe", media_type="application/octet-stream", headers={"Cache-Control": "no-store"})


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
    background_tasks.add_task(DistributionService.remove_file, str(filepath.with_suffix(".exe")))
    background_tasks.add_task(DistributionService.remove_file, str(filepath.with_suffix(".exe.used")))
    for executable in BUILDS_DIR_PATH.glob(f"{token}.*.exe"):
        background_tasks.add_task(DistributionService.remove_file, str(executable))
    
    return FileResponse(path=filepath, filename="Arizona Helper.lua", media_type="application/octet-stream", headers={"Cache-Control": "no-store"})

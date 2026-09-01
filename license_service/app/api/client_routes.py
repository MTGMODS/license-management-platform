from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.service import LicenseService
from app.domain.schemas import CheckRequestDTO
from app.shared.database import get_db

router = APIRouter(prefix="/api/v1/license", tags=["Client"])

_INTERNAL_ERROR = {"valid": False, "error": "Internal server error"}


def _client_ip(request: Request) -> str:
    return (
        request.headers.get("X-Forwarded-For")
        or (request.client.host if request.client else None)
        or "127.0.0.1"
    ).split(",")[0].strip()


@router.post("/check", description="Check license and device for game client")
async def check_license(payload: CheckRequestDTO, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        status_code, body = await LicenseService(db).check_for_client(
            key=payload.key,
            device=payload.device,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent", "Unknown"),
        )
        return JSONResponse(status_code=status_code, content=body)
    except Exception:
        return JSONResponse(status_code=400, content=_INTERNAL_ERROR)

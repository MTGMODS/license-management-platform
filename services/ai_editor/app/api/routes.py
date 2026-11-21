from fastapi import APIRouter

from app.application.service import AIEditorService
from app.domain.schemas import AdRequest, AdResponse

router = APIRouter(prefix="/api/v1/ai_editor", tags=["AI Editor"])


@router.post("/smi", responses={422: {"model": AdResponse}})
async def edit_ads(data: AdRequest) -> AdResponse:
    return await AIEditorService().edit_ad(data)

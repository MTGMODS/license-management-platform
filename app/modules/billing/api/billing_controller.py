from fastapi import APIRouter

router = APIRouter()

@router.post("/api/v1/billing/purchase")
def purchase():
    return {"status": "ok"}
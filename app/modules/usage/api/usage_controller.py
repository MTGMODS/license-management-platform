from fastapi import APIRouter

router = APIRouter()

@router.post("/api/v1/launch")
def launch():
    return {"logged": True}
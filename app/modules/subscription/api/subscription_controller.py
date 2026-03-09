from fastapi import APIRouter

router = APIRouter()

@router.post("/api/v1/subscription/create")
def create():
    return {"message": "created"}

@router.post("/api/v1/subscription/activate")
def activate():
    return {"message": "activated"}

@router.post("/api/v1/subscription/check")
def check():
    return {"valid": True}
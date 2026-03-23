from typing import Optional
from fastapi import APIRouter, Depends, Request
import httpx
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.shared.database import get_db
from app.shared.exceptions import DomainException
from app.modules.billing.application.service import BillingService
from app.modules.identity.application.service import IdentityService
from app.shared.resilience import generator_circuit_breaker
from ..application.service import SubscriptionService

router = APIRouter(prefix="/api/v1/subscription", tags=["Subscription"])

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key", examples=["XXXX-XXXX-XXXX-XXXX"])
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

@router.post("/check")
def check_subscription(payload: CheckRequestDTO, request: Request, db: Session = Depends(get_db)):
    try:
        ip = request.headers.get("X-Forwarded-For", request.client.host)
        user_agent = request.headers.get("User-Agent", "Unknown")

        sub_service = SubscriptionService(db)
        user_id = sub_service.check_access(payload.key, payload.device, ip, user_agent)
        
        nickname = None
        if user_id:
            identity_service = IdentityService(db)
            user = identity_service.get_user_by_id(user_id)
            if user:
                nickname = user.nickname

        if not user_id:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
            
        return {"valid": True, "message": "Access granted", nickname: nickname}
    except DomainException:
        raise
    except Exception as e:
        raise DomainException(message=str(e), status_code=500, error_code="SUBSCRIPTION_ERROR")
    

class KeyCreateDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Duration in days (NULL for forever)")

@router.post("/generate")
def generate_new_key(payload: KeyCreateDTO, db: Session = Depends(get_db)):
    service = SubscriptionService(db)
    new_key = service.generate_unactivated_key(payload.duration_days)
    return {"status": "success", "key": new_key}

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key", examples=["XXXX-XXXX-XXXX-XXXX"])
    user_id: int

@router.post("/activate")
def activate_key(payload: ActivateKeyDTO, db: Session = Depends(get_db)):

    identity_service = IdentityService(db)
    if not identity_service.get_user_by_id(payload.user_id):
        raise DomainException(message=f"User {payload.user_id} ID not found.", status_code=404, error_code="USER_NOT_FOUND")

    sub_service = SubscriptionService(db)
    subscription_id = sub_service.activate_key_for_user(payload.key, payload.user_id)
    if not subscription_id:
        raise DomainException(message="Invalid key or already activated", status_code=400)
    
    billing_service = BillingService(db)
    billing_service.complete_pending_purchase(subscription_id=subscription_id, user_id=payload.user_id)

    return {"status": "success", "message": "Subscription activated successfully"}

class DownloadModDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key", examples=["XXXX-XXXX-XXXX-XXXX"])
    user_id: int

@router.post("/download")
def download_vip_mod(payload: DownloadModDTO, request: Request, db: Session = Depends(get_db)):
    
    sub_service = SubscriptionService(db)
    if not sub_service.validate_for_download(payload.key, payload.user_id):
        raise DomainException(
            message="Відмовлено в доступі. Ключ недійсний, закінчився або належить іншому користувачу.", 
            status_code=403, 
            error_code="DOWNLOAD_FORBIDDEN"
        )
   
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')

    def fetch_from_generator():
        with httpx.Client(timeout=3.0) as client:
            response = client.post(
                "http://127.0.0.1:8005/api/v1/generator/build",
                json={"key": payload.key, "user_id": payload.user_id},
                headers={"X-Correlation-ID": correlation_id}
            )
            response.raise_for_status()
            return response.json()

    try:
        generator_response = generator_circuit_breaker.call(fetch_from_generator)
        return {
            "status": "success",
            "message": "Мод успішно зібрано",
            "file": generator_response["file_content"]
        }
    except Exception as e:
        error_msg = str(e)
        if "CIRCUIT_BREAKER_OPEN" in error_msg:
            raise DomainException(
                message="Сервіс збірки тимчасово перевантажений. Спробуйте через хвилину.", 
                status_code=503, 
                error_code="GENERATOR_UNAVAILABLE"
            )
        else:
            raise DomainException(
                message="Не вдалося зв'язатися з генератором файлів.", 
                status_code=502, 
                error_code="BAD_GATEWAY"
            )
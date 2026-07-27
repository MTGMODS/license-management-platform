from pydantic import BaseModel, Field, field_validator
from app.domain.models import LicenseStatus
from typing import Optional

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    force: bool = Field(False, description="Force activate and deactivate old license")

class GeneratePurchaseDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    method: str = Field(..., description="Payment method")
    status: str = Field(default="COMPLETED", description="PENDING або COMPLETED")
    max_devices: int = Field(default=3, description="Maximum allowed devices")

    @field_validator('method')
    def validate_method(cls, v):
        allowed = ["Stars", "FunPay", "Crypto", "Card", "PayPal", "Manual"]
        if v not in allowed:
            raise ValueError(f'Invalid payment method. Allowed: {allowed}')
        return v

class TelegramBotGenerateDTO(BaseModel):
    duration_days: int = Field(..., description="Duration of the license in days")
    amount: float = Field(..., description="Amount purchased")

class UpdateLicenseDTO(BaseModel):
    status: Optional[LicenseStatus] = None
    reset_limit: Optional[int] = None
    max_devices: Optional[int] = None
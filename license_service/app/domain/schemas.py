from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")

class DownloadRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")

class GeneratePurchaseDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Days (None = forever)")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    method: str = Field(..., description="Payment method")
    user_id: Optional[int] = Field(None, description="User (if exists)")
    status: str = Field("COMPLETED", description="PENDING або COMPLETED")
    max_devices: int = Field(3, description="Limit of devices")

    @field_validator('method')
    def validate_method(cls, v):
        allowed = ["Stars", "FunPay", "Crypto", "Card", "PayPal", "Manual"]
        if v not in allowed:
            raise ValueError(f'Invalid payment method. Allowed: {allowed}')
        return v
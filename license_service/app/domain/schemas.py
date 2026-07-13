from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class KeyCreateDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Duration in days (NULL for forever)")

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    user_id: int

class DownloadRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    user_id: int

class PurchaseCreateDTO(BaseModel):
    user_id: Optional[int] = Field(None, gt=0)
    subscription_id: Optional[int] = Field(None, gt=0)
    amount: float = Field(..., gt=0.0)
    method: str = Field(..., description="Payment method")
    status: str = Field("COMPLETED", description="PENDING or COMPLETED")

    @field_validator('method')
    def validate_method(cls, v):
        allowed = ["Stars", "FunPay", "Crypto", "Card", "PayPal", "Manual"]
        if v not in allowed:
            raise ValueError(f'Invalid payment method. Allowed: {allowed}')
        return v
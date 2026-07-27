from pydantic import BaseModel, Field
from app.domain.models import LicenseStatus, PaymentMethod
from typing import Optional

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    force: bool = Field(False, description="Force activate and deactivate old license")

class GeneratePurchaseDTO(BaseModel):
    count: int = Field(default=1, gt=0, le=1000, description="Number of keys to generate")
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    method: PaymentMethod = Field(..., description="Payment method")
    status: str = Field(default="COMPLETED", description="PENDING or COMPLETED")
    max_devices: int = Field(default=3, description="Maximum allowed devices")

class TelegramBotGenerateDTO(BaseModel):
    duration_days: int = Field(..., description="Duration of the license in days")
    amount: float = Field(..., description="Amount purchased")

class UpdateLicenseDTO(BaseModel):
    status: Optional[LicenseStatus] = None
    reset_limit: Optional[int] = None
    max_devices: Optional[int] = None